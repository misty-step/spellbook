#!/usr/bin/env python3
"""Exercise sync's portable consumer contracts with real Git and gitleaks 8.30.1.

All repositories, installed copies, traces, receipts and state stay below --run-dir.
Only the remediation command and desktop notification are stubs. Git delegates
record argv/cwd and exec the real binary; native hooks inject saves and push races.
Use drive.sh sync for the default contracts, DAYBOOK_SYNC_SLOW=1 for the additional
24-run continued-save check, or --script PATH --case scanner_ for a baseline scan.
No service manager, live vault, credential or remote service is used here.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import shlex
import shutil
import signal
import string
import subprocess
import sys
import threading
import time
import unittest


AGENT = r'''import json, os, pathlib, shlex, signal, subprocess, sys, time
receipt, release, finished = map(pathlib.Path, sys.argv[1:4])
mode = os.environ.get("SYNC_PROOF_AGENT_MODE", "hold")
instruction = sys.argv[4] if len(sys.argv) == 5 else ""
confirmation = instruction.partition("confirm with: ")[2].partition(" . It must ")[0]
try:
    literal_confirmation = shlex.split(confirmation) if confirmation else None
except ValueError:
    literal_confirmation = None
def git(*args):
    result = subprocess.run(["git", *args], capture_output=True, text=True, check=True)
    return result.stdout.strip()
record = {"argv": sys.argv[4:], "cwd": os.getcwd(), "pid": os.getpid(),
          "head": git("rev-parse", "HEAD"),
          "common": str(pathlib.Path(git("rev-parse", "--git-common-dir")).resolve()),
          "linked_worktree": pathlib.Path(".git").is_file(),
          "identity": {key: os.environ.get(key) for key in
                       ("GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL")},
          "episode": os.environ.get("DAYBOOK_SYNC_EPISODE"),
          "confirm": os.environ.get("DAYBOOK_SYNC_CONFIRM"),
          "checkout": os.environ.get("DAYBOOK_SYNC_CHECKOUT"), "started": time.time(),
          "literal_confirmation": literal_confirmation}
with receipt.open("a") as stream:
    stream.write(json.dumps(record) + "\n")
    stream.flush()
    os.fsync(stream.fileno())
if mode == "never":
    def term(*_):
        pathlib.Path(str(finished) + ".term").write_text("TERM\n")
    signal.signal(signal.SIGTERM, term)
if mode == "confirm":
    go = pathlib.Path(str(finished) + ".confirm-go")
    while not go.exists() and not release.exists():
        time.sleep(0.02)
    if go.exists():
        result = subprocess.run(literal_confirmation, capture_output=True, text=True, timeout=30)
        checkout = os.environ["DAYBOOK_SYNC_CHECKOUT"]
        local = git("-C", checkout, "rev-parse", "master")
        remote = git("-C", checkout, "rev-parse", "refs/remotes/origin/master")
        pathlib.Path(str(finished) + ".confirmation").write_text(json.dumps(
            {"code": result.returncode, "stdout": result.stdout, "stderr": result.stderr,
             "local": local, "remote": remote, "at": time.time()}))
        # A scheduled run must not start a second agent after confirmation closes
        # the episode but while this original remediation command is still alive.
        time.sleep(3)
if mode != "exit":
    while mode == "never" or not release.exists():
        time.sleep(0.02)
finished.write_text("finished\n")
'''


GIT_DELEGATE = r'''import json, os, pathlib, sys, time
args = sys.argv[1:]
cwd = pathlib.Path.cwd()
configs = {}
i = 0
while i < len(args):
    arg = args[i]
    if arg == "-C":
        cwd = (cwd / args[i + 1]).resolve()
        i += 2
    elif arg == "-c":
        key, _, value = args[i + 1].partition("=")
        configs[key.lower()] = value.lower()
        i += 2
    elif arg in ("--git-dir", "--work-tree"):
        i += 2
    elif arg.startswith(("--git-dir=", "--work-tree=")):
        i += 1
    else:
        break
verb = args[i] if i < len(args) else ""
log = os.environ.get("SYNC_PROOF_GIT_LOG")
if log:
    row = {"cwd": str(pathlib.Path.cwd()), "workdir": str(cwd), "argv": args,
           "verb": verb, "args": args[i + 1:], "configs": configs, "at": time.time()}
    fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    os.write(fd, (json.dumps(row) + "\n").encode())
    os.close(fd)
if verb in ("fetch", "pull", "push", "ls-remote"):
    time.sleep(float(os.environ.get("SYNC_PROOF_LATENCY", "0")))
os.execv(os.environ["SYNC_PROOF_REAL_GIT"], [os.environ["SYNC_PROOF_REAL_GIT"], *args])
'''


EDITOR = r'''import base64, json, os, pathlib, sys
plan, receipt = map(pathlib.Path, sys.argv[1:3])
try:
    fd = os.open(str(receipt) + ".once", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    sys.exit(0)
os.close(fd)
data = json.loads(plan.read_text())
observed = {}
for name in data["observe"]:
    path = pathlib.Path(data["vault"], name)
    observed[name] = base64.b64encode(path.read_bytes()).decode() if path.exists() else None
path = pathlib.Path(data["vault"], data["target"])
path.parent.mkdir(parents=True, exist_ok=True)
temporary = plan.parent / "editor-buffer.tmp"
temporary.write_bytes(base64.b64decode(data["saved"]))
os.replace(temporary, path)
receipt.write_text(json.dumps({"cwd": os.getcwd(), "observed": observed}))
'''


def inside_run(path):
    root = Path(pwd.getpwuid(os.getuid()).pw_dir, ".cache/tmp").resolve()
    try:
        parts = path.resolve().relative_to(root).parts
    except ValueError:
        return False
    return (len(parts) >= 2 and parts[0].startswith("verify-daybook-")
            and parts[0] not in ("verify-daybook-", "verify-daybook-evidence"))


def alive(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    # A reaped child is not required for the behavioral bound; a zombie cannot
    # block sync or edit files, and reaping an orphan belongs to its supervisor.
    result = subprocess.run(["ps", "-p", str(pid), "-o", "stat="],
                            capture_output=True, text=True)
    return bool(result.stdout.strip()) and not result.stdout.strip().startswith("Z")


class SyncJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not cls.script.is_file() or not os.access(cls.script, os.X_OK):
            raise RuntimeError("the real sync must exist and be executable")
        cls.real_git = shutil.which("git")
        if not cls.real_git:
            raise RuntimeError("sync proof requires real Git on PATH")
        version = subprocess.run(["gitleaks", "version"], capture_output=True, text=True, check=True)
        if not re.search(r"\b8\.30\.1\b", version.stdout):
            raise RuntimeError("sync proof requires real gitleaks 8.30.1 on PATH")
        cls.root.mkdir(parents=True, exist_ok=False)

    def setUp(self):
        self.directory = self.root / self._testMethodName
        self.directory.mkdir()
        self.vault = self.directory / "vault"
        self.other = self.directory / "other"
        self.origin = self.directory / "origin.git"
        self.home = self.directory / "home"
        self.state = self.directory / "state"
        self.receipt = self.directory / "agent-receipts.jsonl"
        self.release = self.directory / "agent.release"
        self.finished = self.directory / "agent.finished"
        self.notification = self.directory / "notifications.jsonl"
        self.trace = self.directory / "git-commands.jsonl"
        self.trace2 = self.directory / "git-trace2.jsonl"
        self.updates = self.directory / "origin-updates.txt"
        self.agent = self.directory / "agent-stub.py"
        self.agent.write_text(AGENT)
        self.executable = self.script
        self.installed = self.directory / "installed libexec" / "sync"
        self.installed.parent.mkdir()
        self.installed.write_bytes(self.script.read_bytes())
        self.installed.chmod(0o700)
        self.watch = {}
        self.watch_lock = threading.Lock()
        self.threads = []
        for directory in (self.home, self.state, self.directory / "tmp", self.directory / "bin"):
            directory.mkdir()
        self.home.joinpath(".gitconfig").write_text(
            "[user]\n\tname = Configured Sync Author\n\temail = sync-author@fixture.invalid\n"
            "[init]\n\tdefaultBranch = master\n[commit]\n\tgpgSign = false\n")
        self.env = {key: value for key, value in os.environ.items()
                    if not key.startswith(("GIT_", "DAYBOOK_SYNC_", "SYNC_PROOF_"))}
        self.env.update(HOME=str(self.home), XDG_CONFIG_HOME=str(self.home / ".config"),
                        XDG_STATE_HOME=str(self.directory / "xdg-state"), TMPDIR=str(self.directory / "tmp"),
                        GIT_CONFIG_NOSYSTEM="1", GIT_TERMINAL_PROMPT="0", LC_ALL="C",
                        DAYBOOK_SYNC_STATE=str(self.state), DAYBOOK_SYNC_QUIET="0", DAYBOOK_SYNC_ESCALATE_AFTER="0",
                        DAYBOOK_SYNC_AGENT=shlex.join(self.agent_command()),
                        SYNC_PROOF_REAL_GIT=self.real_git)
        self.install_delegates()
        self.command(["git", "init", "--bare", "--initial-branch=master", str(self.origin)])
        self.git(self.origin, "config", "receive.denyNonFastForwards", "true")
        self.git(self.origin, "config", "receive.denyDeletes", "true")
        self.install_publication_guard()
        self.command(["git", "clone", str(self.origin), str(self.vault)])
        self.vault.joinpath("notes").mkdir()
        self.vault.joinpath("notes/shared.md").write_bytes(b"base line\n")
        self.vault.joinpath("notes/untouched.md").write_bytes(b"unchanged fixture\r\n")
        self.commit(self.vault, "fixture: seed")
        self.git(self.vault, "push", "--set-upstream", "origin", "master")
        self.command(["git", "clone", str(self.origin), str(self.other)])
        self.base = self.sha(self.vault)

    def tearDown(self):
        self.release.touch()
        for stop, thread in self.threads:
            stop.set()
            thread.join(timeout=5)
        # Every PID comes from a receipt produced by this fixture's command.
        # Never target the supervisor by assuming it is the agent executable.
        for record in self.receipts():
            pid = record["pid"]
            deadline = time.monotonic() + 5
            while alive(pid) and time.monotonic() < deadline:
                time.sleep(0.02)
            if alive(pid):
                process = subprocess.run(["ps", "-p", str(pid), "-o", "command="],
                                         capture_output=True, text=True)
                if str(self.agent) in process.stdout:
                    os.kill(pid, signal.SIGKILL)

    def install_delegates(self):
        delegate = self.directory / "git-delegate.py"
        delegate.write_text(GIT_DELEGATE)
        binary = self.directory / "bin/git"
        binary.write_text(f"#!/bin/sh\nexec {shlex.quote(sys.executable)} -I {shlex.quote(str(delegate))} \"$@\"\n")
        binary.chmod(0o700)
        notify = self.directory / "bin/osascript"
        notify.write_text(f"#!/bin/sh\nprintf '%s\\n' notification >> {shlex.quote(str(self.notification))}\n")
        notify.chmod(0o700)
        self.env["PATH"] = str(self.directory / "bin") + os.pathsep + self.env.get("PATH", os.defpath)

    def install_publication_guard(self):
        hook = self.origin / "hooks/pre-receive"
        hook.write_text("#!/bin/sh\nrc=0\nwhile read old new ref; do\n"
                        "  kind=ff\n"
                        "  if [ \"$old\" = 0000000000000000000000000000000000000000 ]; then kind=create\n"
                        "  elif [ \"$new\" = 0000000000000000000000000000000000000000 ]; then kind=delete; rc=1\n"
                        "  elif ! git merge-base --is-ancestor \"$old\" \"$new\"; then kind=nonff; rc=1; fi\n"
                        f"  printf '%s %s %s %s\\n' \"$kind\" \"$old\" \"$new\" \"$ref\" >> {shlex.quote(str(self.updates))}\n"
                        "done\nexit \"$rc\"\n")
        hook.chmod(0o700)

    def agent_command(self):
        return [sys.executable, "-I", str(self.agent), str(self.receipt), str(self.release), str(self.finished)]

    def command(self, args, cwd=None, check=True, env=None, binary=False):
        result = subprocess.run(args, cwd=cwd, env=env or self.env, capture_output=True,
                                text=not binary, timeout=60)
        if check and result.returncode:
            # Never echo scanner diagnostics or generated token-shaped fixture data.
            self.fail(f"fixture command {Path(args[0]).name} failed (exit {result.returncode})")
        return result

    def git(self, repo, *args, check=True):
        return self.command(["git", "-C", str(repo), *args], check=check).stdout.strip()

    def sha(self, repo, ref="HEAD"):
        return self.git(repo, "rev-parse", ref)

    def commit(self, repo, subject):
        self.git(repo, "add", "-A")
        self.git(repo, "commit", "-m", subject)
        return self.sha(repo)

    def remote_write(self, path, content, subject="fixture: remote edit"):
        target = self.other / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        commit = self.commit(self.other, subject)
        self.git(self.other, "push", "origin", "master")
        return commit

    def remote_bytes(self, path):
        return self.command(["git", "--git-dir", str(self.origin), "show", f"master:{path}"],
                            binary=True).stdout

    def manifest(self):
        return {str(path.relative_to(self.vault)): path.read_bytes()
                for path in self.vault.rglob("*") if path.is_file()
                and ".git" not in path.relative_to(self.vault).parts}

    def wait_for(self, condition, message, seconds=8):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if condition():
                return
            time.sleep(0.02)
        self.fail(message)

    def watch_files(self, expected):
        with self.watch_lock:
            self.watch.update({name: {content} for name, content in expected.items()})

    def sync(self, code, outcome):
        stop = threading.Event()
        violations = set()

        def observe():
            while not stop.is_set():
                with self.watch_lock:
                    for name, allowed in self.watch.items():
                        path = self.vault / name
                        try:
                            content = path.read_bytes()
                        except FileNotFoundError:
                            content = None
                        if content not in allowed:
                            violations.add(name)
                stop.wait(0.005)

        observer = threading.Thread(target=observe, daemon=True)
        observer.start()
        env = dict(self.env, SYNC_PROOF_GIT_LOG=str(self.trace), GIT_TRACE2_EVENT=str(self.trace2))
        try:
            result = self.command([str(self.executable), str(self.vault)], cwd=self.directory,
                                  check=False, env=env)
        finally:
            stop.set()
            observer.join(timeout=5)
        self.assertFalse(violations, "disk never rolls back locally committed or editor-saved bytes")
        self.assertEqual(result.returncode, code, "sync exit status")
        self.assertTrue(result.stderr == "", "sync emits no stderr or private Git/scanner diagnostics")
        lines = result.stdout.splitlines()
        self.assertEqual(len(lines), 1, "exactly one stdout outcome line per run")
        outcomes = (outcome,) if isinstance(outcome, str) else outcome
        self.assertTrue(any(lines[0].startswith(f"sync: {item}") for item in outcomes),
                        "stdout identifies the expected outcome")
        self.assert_git_boundaries()
        self.assert_publication_history()
        return result.stdout

    def git_trace(self):
        if not self.trace.exists():
            return []
        return [json.loads(line) for line in self.trace.read_text().splitlines()]

    def assert_git_boundaries(self):
        root = str(self.vault.resolve())
        for event in self.git_trace():
            verb, args = event["verb"], event["args"]
            if verb == "push":
                self.assertFalse(any(arg.startswith(("--force", "+")) or arg == "-f" for arg in args),
                                 "no force-push is attempted in any checkout")
            if event["workdir"] != root:
                continue
            self.assertNotIn(verb, ("rebase", "pull", "checkout", "switch", "cherry-pick", "revert", "am", "read-tree"),
                             "operator checkout is not a rebase/conflict/rollback workspace")
            self.assertNotIn("--abort", args, "operator checkout never aborts Git operations")
            if verb == "reset":
                self.assertNotIn("--hard", args, "operator disk is never reset")
            if verb == "merge":
                self.assertIn("--ff-only", args, "only a fast-forward may integrate operator files")
                self.assertTrue("--no-autostash" in args or event["configs"].get("merge.autostash") == "false",
                                "operator integration cannot autostash editor saves")
        self.assertTrue(self.trace2.exists(), "native Git trace2 accompanies argv/cwd instrumentation")

    def assert_publication_history(self):
        if not self.updates.exists():
            return
        for row in self.updates.read_text().splitlines():
            kind, old, new, ref = row.split()
            self.assertIn(kind, ("ff", "create"), "origin receives no delete or non-fast-forward attempt")
            self.assertEqual(ref, "refs/heads/master", "only the intended remote branch is published")
            if kind == "ff":
                self.git(self.origin, "merge-base", "--is-ancestor", old, new)
            self.git(self.origin, "merge-base", "--is-ancestor", new, "master")

    def receipts(self):
        if not self.receipt.exists():
            return []
        # Appended records are emitted in one write, but tolerate the brief fsync
        # window while waiting for a newly launched process.
        return [json.loads(line) for line in self.receipt.read_text().splitlines() if line.strip()]

    def reports(self):
        return sorted(self.state.glob("report-*.txt"))

    def notification_count(self):
        return len(self.notification.read_text().splitlines()) if self.notification.exists() else 0

    def no_agent(self):
        self.assertEqual(self.receipts(), [], "no remediation command invoked")
        self.assertFalse(self.state.joinpath("agent.pid").exists(), "no supervisor pid recorded")
        self.assertEqual(self.reports(), [], "no escalation report")
        self.assertEqual(self.notification_count(), 0, "no escalation notification")

    def escalation(self, stdout, *relevant):
        self.wait_for(lambda: bool(self.receipts()), "remediation command produces an observable receipt")
        records = self.receipts()
        self.assertEqual(len(records), 1, "exactly one observable agent receipt")
        record = records[0]
        cwd = Path(record["cwd"]).resolve()
        self.assertNotEqual(cwd, self.vault.resolve(), "agent starts in its own worktree, never the operator checkout")
        self.assertTrue(self.directory.resolve() in cwd.parents, "agent worktree stays in disposable fixture state")
        self.assertTrue(record["linked_worktree"], "remediation starts in a separate linked worktree")
        self.assertEqual(Path(record["common"]), self.vault.joinpath(".git").resolve(), "agent worktree shares only Git storage")
        self.assertEqual(record["head"], self.sha(self.vault, "master"), "new agent worktree starts from operator master")
        for role in ("AUTHOR", "COMMITTER"):
            self.assertEqual(record["identity"][f"GIT_{role}_NAME"], "Daybook Remediation",
                             "agent Git author and committer use its own name")
            self.assertEqual(record["identity"][f"GIT_{role}_EMAIL"], "daybook-remediation@agents.misty-step.com",
                             "agent Git author and committer use its own email")
        self.assertEqual(len(record["argv"]), 1, "command-string override receives exactly one prompt argument")
        if self.env.get("SYNC_PROOF_AGENT_MODE", "hold") != "exit":
            self.assertTrue(alive(int(self.state.joinpath("agent.pid").read_text())), "agent.pid identifies a live supervisor")
            self.assertEqual(record["episode"], self.state.joinpath("agent.episode").read_text().strip(),
                             "inherited confirmation context is the supervising episode")
            self.assertTrue(self.state.joinpath("agent.started").is_file(), "supervisor lifetime has a wall-clock start")
        self.assertEqual(record["confirm"], str(self.executable), "agent confirms with the same reviewed executable")
        self.assertEqual(record["checkout"], str(self.vault), "confirmation targets the original checkout explicitly")
        reports = self.reports()
        self.assertEqual(len(reports), 1, "one report accompanies escalation")
        self.assertEqual(self.notification_count(), 1, "one desktop notification accompanies escalation")
        report = reports[0]
        prompt = record["argv"][0]
        self.assertIn(str(report), prompt, "agent receives the real report path")
        self.assertIn("AGENTS.md", prompt, "remediation authority has one referenced home")
        self.assertEqual(record["literal_confirmation"], [str(self.executable), str(self.vault)],
                         "the prompt's shell-literal confirmation names the reviewed executable and checkout")
        self.assertIn(str(report), stdout, "outcome points to the report")
        body = report.read_text()
        for section in ("Reason:", "Checkout:", "Failing command stderr:", "Git status --short", "Local-only commits:", "Remote-only commits:"):
            self.assertTrue(section in body, "report carries actionable Git state")
        for item in relevant:
            self.assertTrue(item in body, "report includes the relevant failure or conflicting path")
        return body

    def one_episode(self):
        self.assertEqual(len(self.receipts()), 1, "open episode never starts another agent")
        self.assertEqual(len(self.reports()), 1, "open episode never writes another report")
        self.assertEqual(self.notification_count(), 1, "open episode never notifies twice")

    def settled_agent(self):
        def settled():
            try:
                pid = int(self.state.joinpath("agent.pid").read_text())
            except FileNotFoundError:
                return True
            return not alive(pid)
        self.wait_for(settled, "supervisor has ended its completed lifetime")

    def synchronized(self, new_episode=False):
        self.assertEqual(self.sha(self.origin, "master"), self.sha(self.vault, "master"), "bare origin contains checkout master")
        self.assertEqual(self.sha(self.vault, "origin/master"), self.sha(self.vault, "master"), "local tracking and master refs agree")
        self.assertEqual(self.git(self.vault, "status", "--porcelain"), "", "checkout has no pending change")
        self.assertEqual(self.state.joinpath("failures").read_text().strip(), "0", "success clears consecutive failures")
        if not new_episode:
            self.no_agent()

    def no_operation(self):
        self.assertEqual(self.git(self.vault, "symbolic-ref", "--short", "HEAD"), "master", "operator remains on master")
        self.assertEqual(self.git(self.vault, "diff", "--name-only", "--diff-filter=U"), "", "operator index has no unresolved entries")
        for name in ("rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "sequencer"):
            self.assertFalse(self.vault.joinpath(".git", name).exists(), "operator has no abandoned Git operation")

    def test_clean_noop(self):
        before = self.manifest()
        self.sync(0, "synchronized")
        self.assertEqual(self.sha(self.vault), self.base, "no empty commit")
        self.assertEqual(self.manifest(), before, "no working-tree byte changes")
        self.synchronized()
        self.state.joinpath("failures").write_text("2\n")
        self.sync(0, "synchronized")
        self.assertEqual(self.sha(self.vault), self.base, "recovery still creates no commit")
        self.synchronized()
        verbs = {event["verb"] for event in self.git_trace()}
        self.assertNotIn("fetch", verbs, "a clean, published checkout needs no fetch")
        self.assertNotIn("push", verbs, "a clean, published checkout needs no push")

    def test_quiet_period_defers_then_publishes(self):
        self.env["DAYBOOK_SYNC_QUIET"] = "3600"
        path = self.vault / "notes/typing.md"
        path.write_bytes(b"still typing\n")
        failures = self.state.joinpath("failures").read_bytes() if self.state.joinpath("failures").exists() else None
        for _ in range(2):
            stdout = self.sync(0, "deferred")
            self.assertIn("ago", stdout, "deferral says how recently the change was saved")
        self.assertEqual(self.sha(self.vault), self.base, "deferral creates no commit")
        self.assertEqual(self.sha(self.origin, "master"), self.base, "deferral publishes nothing")
        self.assertEqual(path.read_bytes(), b"still typing\n", "deferral leaves saved bytes alone")
        after = self.state.joinpath("failures").read_bytes() if self.state.joinpath("failures").exists() else None
        self.assertEqual(after, failures, "deferral neither resets nor increments failures")
        verbs = {event["verb"] for event in self.git_trace()}
        self.assertFalse(verbs & {"fetch", "push", "ls-remote", "commit", "merge"}, "deferral touches neither history nor origin")
        self.assertTrue(self.state.joinpath("deferred-since").exists(), "the first deferral is recorded")
        settled = time.time() - 7200
        os.utime(path, (settled, settled))
        self.sync(0, "synchronized")
        self.assertEqual(self.remote_bytes("notes/typing.md"), b"still typing\n", "the first run after the quiet period publishes")
        self.assertFalse(self.state.joinpath("deferred-since").exists(), "a run that proceeds clears the deferral")
        self.synchronized()

    def test_writer_that_never_pauses_publishes_after_max_defer(self):
        self.env.update(DAYBOOK_SYNC_QUIET="3600", DAYBOOK_SYNC_MAX_DEFER="3600")
        path = self.vault / "notes/busy.md"
        path.write_bytes(b"continuous writer\n")
        self.sync(0, "deferred")
        self.state.joinpath("deferred-since").write_text(f"{int(time.time()) - 7200}\n")
        path.write_bytes(b"continuous writer, saved again\n")
        self.sync(0, "synchronized")
        self.assertEqual(self.remote_bytes("notes/busy.md"), b"continuous writer, saved again\n",
                         "deferral is bounded even while saves continue")
        self.synchronized()

    def test_local_edits_use_configured_identity(self):
        self.vault.joinpath("notes/shared.md").write_bytes(b"local edit\r\n")
        self.vault.joinpath("notes/new name \u00e9.md").write_bytes(b"new fixture note\n")
        journal = self.vault / "journal/2026/10"
        journal.mkdir(parents=True)
        journal.joinpath("30.md").write_bytes(b"Synthetic human journal words, unchanged.\r\n")
        before = self.manifest()
        self.sync(0, "synchronized")
        self.assertNotEqual(self.sha(self.vault), self.base, "local edits become a commit")
        self.assertEqual(self.git(self.vault, "log", "-1", "--format=%an <%ae>|%cn <%ce>"),
                         "Configured Sync Author <sync-author@fixture.invalid>|Configured Sync Author <sync-author@fixture.invalid>")
        self.assertEqual(self.git(self.vault, "rev-list", "--count", f"{self.base}..HEAD"), "1", "one sync commit")
        self.assertRegex(self.git(self.vault, "log", "-1", "--format=%s"), r"^sync: \S+ 3 files$")
        self.assertEqual(self.manifest(), before, "commit preserves exact working-tree bytes")
        for path, content in before.items():
            self.assertEqual(self.remote_bytes(path), content, "remote has the actual disk bytes")
        self.synchronized()

    def test_remote_only_fast_forward(self):
        remote = self.remote_write("notes/shared.md", b"remote edit\n")
        self.sync(0, "synchronized")
        self.assertEqual(self.sha(self.vault), remote, "remote-only update fast-forwards without a merge commit")
        self.assertEqual(self.vault.joinpath("notes/shared.md").read_bytes(), b"remote edit\n")
        self.assertEqual(self.vault.joinpath("notes/untouched.md").read_bytes(), b"unchanged fixture\r\n")
        self.synchronized()

    def test_different_file_divergence(self):
        self.vault.joinpath("notes/local.md").write_bytes(b"local side\n")
        local = self.commit(self.vault, "fixture: local commit")
        remote = self.remote_write("notes/remote.md", b"remote side\n")
        self.sync(0, "synchronized")
        self.git(self.vault, "merge-base", "--is-ancestor", local, "HEAD")
        self.git(self.vault, "merge-base", "--is-ancestor", remote, "HEAD")
        self.assertEqual(self.git(self.vault, "show", "-s", "--format=%s", local), "fixture: local commit", "existing local commit is never rewritten")
        parents = self.git(self.vault, "show", "-s", "--format=%P", "HEAD").split()
        self.assertEqual(set(parents), {local, remote}, "ordinary merge preserves both divergent histories")
        private_merges = [event for event in self.git_trace() if event["verb"] == "merge"
                          and event["workdir"] != str(self.vault.resolve())]
        self.assertTrue(private_merges, "divergent integration happens in a disposable worktree")
        self.assertEqual(self.remote_bytes("notes/local.md"), b"local side\n")
        self.assertEqual(self.remote_bytes("notes/remote.md"), b"remote side\n")
        self.assertEqual(self.vault.joinpath("notes/remote.md").read_bytes(), b"remote side\n")
        self.synchronized()

    def test_push_race_merges_and_retries(self):
        self.vault.joinpath("notes/local.md").write_bytes(b"local before race\n")
        marker = self.directory / "race.started"
        receipt = self.directory / "race.commit"
        hook = self.vault / ".git/hooks/pre-push"
        hook.write_text("#!/bin/sh\nset -eu\n"
                        f"test ! -e {shlex.quote(str(marker))} || exit 0\n"
                        f": >{shlex.quote(str(marker))}\n"
                        "unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR\n"
                        f"cd {shlex.quote(str(self.other))}\n"
                        "git pull --ff-only origin master\n"
                        "printf 'second clone won race\\n' > notes/raced.md\n"
                        "git add notes/raced.md\ngit commit -m 'fixture: injected push race'\n"
                        "git push origin master\n"
                        f"git rev-parse HEAD >{shlex.quote(str(receipt))}\n")
        hook.chmod(0o700)
        self.sync(0, "synchronized")
        self.assertTrue(marker.exists() and receipt.exists(), "native hook actually injected a second-clone push")
        remote = receipt.read_text().strip()
        self.git(self.vault, "merge-base", "--is-ancestor", remote, "HEAD")
        local_commits = self.git(self.vault, "log", "--format=%H", "--grep=^sync:", f"{self.base}..HEAD").splitlines()
        self.assertEqual(len(local_commits), 1, "one unchanged local sync commit survives rejected-push retry")
        self.git(self.origin, "merge-base", "--is-ancestor", local_commits[0], "master")
        self.assertEqual(self.remote_bytes("notes/local.md"), b"local before race\n")
        self.assertEqual(self.remote_bytes("notes/raced.md"), b"second clone won race\n")
        self.assertEqual(self.vault.joinpath("notes/raced.md").read_bytes(), b"second clone won race\n")
        self.synchronized()

    def test_same_line_conflict_preserves_and_escalates_once(self):
        self.env["SYNC_PROOF_AGENT_MODE"] = "exit"
        self.vault.joinpath("notes/local.md").write_bytes(b"already committed locally\n")
        local = self.commit(self.vault, "fixture: retained local commit")
        self.vault.joinpath("notes/shared.md").write_bytes(b"local conflicting line\r\n")
        self.vault.joinpath("notes/pending.md").write_bytes(b"uncommitted bytes survive\r\n")
        remote = self.remote_write("notes/shared.md", b"remote conflicting line\n")
        before = self.manifest()
        self.watch_files(before)
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.manifest(), before, "conflict never rewrites operator bytes")
        self.git(self.vault, "merge-base", "--is-ancestor", local, "HEAD")
        root_head = self.sha(self.vault)
        self.assertEqual(self.sha(self.origin, "master"), remote, "conflicted local work is never pushed")
        self.assertEqual(self.remote_bytes("notes/shared.md"), b"remote conflicting line\n")
        self.no_operation()
        self.escalation(stdout, "notes/shared.md", local[:7], remote[:7])
        self.wait_for(self.finished.exists, "exited conflict agent finishes")
        self.settled_agent()
        for _ in range(3):
            self.sync(1, "remediation pending")
            self.assertEqual(self.sha(self.vault), root_head, "repeated conflicts retain the same local history")
            self.assertEqual(self.manifest(), before, "held conflict retains every disk byte")
            self.no_operation()
        self.one_episode()

    def scanner_case(self, case):
        alphabet = string.ascii_letters + string.digits
        secret = "ghp_" + "".join(secrets.choice(alphabet) for _ in range(36))
        path = {"committed_diff": "raw/sessions/fixture.md", "svg": "attachments/diagram.svg"}.get(case, "notes/leaky.md")
        if case == "committed_diff":
            self.vault.joinpath(".gitattributes").write_text("raw/** -diff\n")
            self.commit(self.vault, "fixture: committed attributes")
            self.git(self.vault, "push", "origin", "master")
            self.base = self.sha(self.vault)
        leaky = self.vault / path
        leaky.parent.mkdir(parents=True, exist_ok=True)
        line = f"generated scanner fixture: {secret}"
        if case == "inline_allow":
            line += " # gitleaks:allow"
        leaky.write_text(line + "\n")
        if case == "pending_diff":
            self.vault.joinpath(".gitattributes").write_text("*.md -diff\n")
        elif case == "binary":
            self.vault.joinpath(".gitattributes").write_text("notes/** binary\n")
        elif case == "config":
            self.vault.joinpath(".gitleaks.toml").write_text(
                '[extend]\nuseDefault = true\n[allowlist]\ndescription = "fixture repository override"\npaths = [\'\'\'.*\'\'\']\n')
        self.git(self.vault, "add", "-A")
        if case in ("control", "fingerprint"):
            report = self.directory / "scanner-control.json"
            scan = self.command(["gitleaks", "git", "--staged", "--no-banner", "--redact", "--log-level", "error",
                                 "--report-format", "json", "--report-path", str(report), "."],
                                cwd=self.vault, check=False)
            self.assertEqual(scan.returncode, 1, "real scanner rejects the generated control secret")
            findings = json.loads(report.read_text())
            self.assertTrue(findings, "real scanner emits a finding for the control")
            if case == "fingerprint":
                self.vault.joinpath(".gitleaksignore").write_text("\n".join(item["Fingerprint"] for item in findings) + "\n")
            report.unlink()
        before = self.manifest()
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.sha(self.vault), self.base, "scanner rejection creates no commit")
        self.assertEqual(self.sha(self.origin, "master"), self.base, "generated secret never reaches origin")
        self.assertTrue(self.manifest() == before, "all rejected bytes and repository-control files remain on disk")
        self.assertEqual(self.git(self.vault, "diff", "--cached", "--name-only"), "", "scanner rejection unstages the whole pending index")
        self.assertEqual(self.git(self.vault, "ls-files", "--error-unmatch", path, check=False), "", "secret path was not committed")
        report = self.escalation(stdout, path, "gitleaks")
        exposed = stdout + report
        for log in list(self.state.rglob("*.log")) + [self.trace, self.trace2, self.receipt]:
            if log.is_file():
                exposed += log.read_text(errors="replace")
        self.assertTrue(secret not in exposed, "outcomes, reports, logs, command traces and receipts contain no generated secret")
        return secret, leaky

    def test_gitleaks_rejection_leaves_file_unstaged(self):
        self.scanner_case("control")

    def test_scanner_pending_diff(self):
        self.scanner_case("pending_diff")

    def test_scanner_binary(self):
        self.scanner_case("binary")

    def test_scanner_fingerprint(self):
        self.scanner_case("fingerprint")

    def test_scanner_committed_diff(self):
        self.scanner_case("committed_diff")

    def test_scanner_config(self):
        self.scanner_case("config")

    def test_scanner_inline_allow(self):
        self.scanner_case("inline_allow")

    def test_scanner_svg(self):
        self.scanner_case("svg")

    def test_secret_episode_survives_killed_agent(self):
        _, leaky = self.scanner_case("control")
        pid = self.receipts()[0]["pid"]
        os.kill(pid, signal.SIGKILL)
        self.wait_for(lambda: not alive(pid), "fixture agent is actually killed")
        self.settled_agent()
        for _ in range(2):
            self.sync(1, "remediation pending")
            self.assertTrue(leaky.exists(), "held secret remains on disk")
            self.assertEqual(self.sha(self.vault), self.base, "held secret never commits")
            self.assertEqual(self.sha(self.origin, "master"), self.base, "held secret never publishes")
            self.assertEqual(self.git(self.vault, "diff", "--cached", "--name-only"), "", "every rejection leaves index unstaged")
        self.one_episode()

    def test_unreachable_remote_episode_and_recovery(self):
        self.env["SYNC_PROOF_AGENT_MODE"] = "exit"
        self.vault.joinpath("notes/local.md").write_bytes(b"recoverable offline edit\n")
        self.git(self.vault, "remote", "set-url", "origin", str(self.directory / "unreachable.git"))
        local = None
        for failure in (1, 2):
            stdout = self.sync(1, "failed")
            self.assertIn(f"({failure} consecutive failed runs", stdout, "failures report their consecutive count")
            self.assertEqual(self.state.joinpath("failures").read_text().strip(), str(failure))
            self.no_agent()
            if local is None:
                local = self.sha(self.vault)
                self.assertNotEqual(local, self.base, "offline edit is committed locally")
            self.assertEqual(self.sha(self.vault), local, "failure never replaces the local commit")
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.state.joinpath("failures").read_text().strip(), "3")
        self.escalation(stdout, local[:7])
        self.wait_for(self.finished.exists, "unfixed agent exits")
        self.settled_agent()
        for _ in range(2):
            self.sync(1, "remediation pending")
            self.assertEqual(self.sha(self.vault), local, "pending episode preserves the original commit")
        self.one_episode()
        self.assertEqual(self.sha(self.origin, "master"), self.base, "unreachable origin is unchanged")
        self.assertEqual(self.vault.joinpath("notes/local.md").read_bytes(), b"recoverable offline edit\n")
        self.git(self.vault, "remote", "set-url", "origin", str(self.origin))
        self.sync(0, "synchronized")
        self.synchronized(new_episode=True)
        self.git(self.vault, "remote", "set-url", "origin", str(self.directory / "unreachable-again.git"))
        stdout = self.sync(1, "failed")
        self.assertIn("(1 consecutive failed runs", stdout, "later failure belongs to a new consecutive-failure count")
        self.assertEqual(self.state.joinpath("failures").read_text().strip(), "1")
        self.one_episode()
        self.sync(1, "failed")
        self.sync(1, "escalated")
        self.wait_for(lambda: len(self.receipts()) == 2, "a later episode may start its own remediation agent")
        self.assertEqual(len(self.reports()), 2, "successful synchronization closed the previous report episode")
        self.assertEqual(self.notification_count(), 2, "only the genuinely new episode notifies again")

    def test_escalation_waits_for_failure_window(self):
        self.env.update(SYNC_PROOF_AGENT_MODE="exit", DAYBOOK_SYNC_ESCALATE_AFTER="3600")
        self.git(self.vault, "remote", "set-url", "origin", str(self.directory / "unreachable.git"))
        for failure in range(1, 5):
            stdout = self.sync(1, "failed")
            self.assertIn(f"({failure} consecutive failed runs", stdout, "each failure reports its count")
            self.no_agent()
        self.state.joinpath("failing-since").write_text(f"{int(time.time()) - 7200}\n")
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.state.joinpath("failures").read_text().strip(), "5")
        self.escalation(stdout)
        self.wait_for(self.finished.exists, "unfixed agent exits")
        self.settled_agent()
        self.sync(1, "remediation pending")
        self.one_episode()

    def test_unsafe_branch_escalates_without_mutation(self):
        self.git(self.vault, "checkout", "-b", "fixture/topic")
        self.vault.joinpath("notes/shared.md").write_bytes(b"staged on another branch\n")
        self.git(self.vault, "add", "notes/shared.md")
        self.vault.joinpath("notes/shared.md").write_bytes(b"newer branch bytes\r\n")
        before = self.manifest()
        status = self.git(self.vault, "status", "--porcelain")
        tree = self.git(self.vault, "write-tree")
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.sha(self.vault), self.base)
        self.assertEqual(self.sha(self.origin, "master"), self.base)
        self.assertEqual(self.git(self.vault, "symbolic-ref", "--short", "HEAD"), "fixture/topic")
        self.assertEqual(self.manifest(), before, "unsafe branch preserves disk bytes")
        self.assertEqual(self.git(self.vault, "status", "--porcelain"), status)
        self.assertEqual(self.git(self.vault, "write-tree"), tree, "unsafe branch preserves staged bytes")
        self.escalation(stdout, "master", "notes/shared.md")

    def test_in_progress_merge_escalates_without_mutation(self):
        self.git(self.vault, "checkout", "-b", "fixture/other")
        self.vault.joinpath("notes/shared.md").write_bytes(b"other branch line\n")
        other = self.commit(self.vault, "fixture: other branch")
        self.git(self.vault, "checkout", "master")
        self.vault.joinpath("notes/shared.md").write_bytes(b"master branch line\n")
        local = self.commit(self.vault, "fixture: master branch")
        merge = self.command(["git", "-C", str(self.vault), "merge", "--no-commit", other], check=False)
        self.assertEqual(merge.returncode, 1, "a real same-line merge reaches the in-progress guard")
        before = self.manifest()
        status = self.git(self.vault, "status", "--porcelain")
        index = self.git(self.vault, "ls-files", "--stage")
        merge_head = self.vault.joinpath(".git/MERGE_HEAD").read_bytes()
        stdout = self.sync(1, "escalated")
        self.assertEqual(self.sha(self.vault), local, "existing local commit remains the branch tip")
        self.assertEqual(self.sha(self.origin, "master"), self.base)
        self.assertEqual(self.manifest(), before, "existing operation's disk bytes are untouched")
        self.assertEqual(self.git(self.vault, "status", "--porcelain"), status)
        self.assertEqual(self.git(self.vault, "ls-files", "--stage"), index, "existing unresolved index is untouched")
        self.assertEqual(self.vault.joinpath(".git/MERGE_HEAD").read_bytes(), merge_head, "sync never aborts another author's operation")
        self.escalation(stdout, "MERGE_HEAD", "notes/shared.md")

    def test_live_agent_skips_without_touching_git(self):
        self.scanner_case("control")
        self.vault.joinpath("notes/shared.md").write_bytes(b"pending while agent works\n")
        self.git(self.vault, "add", "notes/shared.md")
        self.vault.joinpath("notes/shared.md").write_bytes(b"newer pending bytes\r\n")
        before = self.manifest()
        status = self.git(self.vault, "status", "--porcelain")
        tree = self.git(self.vault, "write-tree")
        failures = self.state.joinpath("failures").read_bytes() if self.state.joinpath("failures").exists() else None
        self.sync(0, "skipped")
        self.assertEqual(self.sha(self.vault), self.base)
        self.assertEqual(self.sha(self.origin, "master"), self.base)
        self.assertTrue(self.manifest() == before, "bounded live-agent skip leaves working-tree bytes unchanged")
        self.assertEqual(self.git(self.vault, "status", "--porcelain"), status)
        self.assertEqual(self.git(self.vault, "write-tree"), tree, "skip leaves staged bytes unchanged")
        after = self.state.joinpath("failures").read_bytes() if self.state.joinpath("failures").exists() else None
        self.assertEqual(after, failures, "skip neither resets nor increments failures")
        self.one_episode()

    def install_editor_hook(self, target, saved, expected):
        plan = self.directory / "editor-plan.json"
        receipt = self.directory / "editor-save.json"
        editor = self.directory / "editor.py"
        editor.write_text(EDITOR)
        plan.write_text(json.dumps({"vault": str(self.vault), "target": target,
                                    "saved": base64.b64encode(saved).decode(), "observe": list(expected)}))
        hook = self.vault / ".git/hooks/post-checkout"
        hook.write_text(f"#!/bin/sh\nexec {shlex.quote(sys.executable)} -I {shlex.quote(str(editor))} "
                        f"{shlex.quote(str(plan))} {shlex.quote(str(receipt))}\n")
        hook.chmod(0o700)
        self.watch_files(expected)
        with self.watch_lock:
            self.watch[target] = {expected.get(target), saved}
        return receipt

    def editor_save_case(self, kind):
        journal = "journal/2026/10/30.md"
        if kind == "committed_buffer":
            target = journal
            path = self.vault / target
            path.parent.mkdir(parents=True)
            path.write_bytes(b"morning words\n")
            self.commit(self.vault, "fixture: initial synthetic journal")
            self.git(self.vault, "push", "origin", "master")
            self.git(self.other, "pull", "--ff-only", "origin", "master")
            before = b"morning words\nwords from the last ten minutes\n"
            path.write_bytes(before)
            saved = before + b"words typed during integration\n"
        elif kind == "tracked_unrelated":
            target = "notes/untouched.md"
            before = self.vault.joinpath(target).read_bytes()
            saved = before + b"editor save during integration\r\n"
        else:
            target = journal
            before = None
            saved = b"first save of a new synthetic journal entry\r\n"
        self.vault.joinpath("notes/local.md").write_bytes(b"locally committed words must never disappear\n")
        expected = {"notes/local.md": self.vault.joinpath("notes/local.md").read_bytes(), target: before}
        remote = self.remote_write("notes/remote.md", b"agent's unrelated remote note\n")
        receipt = self.install_editor_hook(target, saved, expected)
        self.sync(0, "synchronized")
        self.assertTrue(receipt.exists(), "native post-checkout hook actually injected the editor save during integration")
        observed = json.loads(receipt.read_text())
        decoded = {name: base64.b64decode(value) if value is not None else None
                   for name, value in observed["observed"].items()}
        self.assertEqual(decoded, expected, "operator disk never shows upstream-only bytes instead of its local words")
        self.assertNotEqual(Path(observed["cwd"]).resolve(), self.vault.resolve(), "post-checkout belongs to a disposable integration worktree")
        self.assertEqual(self.vault.joinpath(target).read_bytes(), saved, "every full-buffer editor-save byte remains on disk")
        self.assertEqual(self.vault.joinpath("notes/local.md").read_bytes(), expected["notes/local.md"])
        self.git(self.vault, "merge-base", "--is-ancestor", remote, "HEAD")
        self.no_operation()
        self.no_agent()
        self.watch_files({target: saved})
        self.sync(0, "synchronized")
        self.assertEqual(self.remote_bytes(target), saved, "first quiet run publishes every byte saved during integration")
        self.assertEqual(self.remote_bytes("notes/local.md"), expected["notes/local.md"])
        self.synchronized()

    def test_editor_save_committed_journal_buffer(self):
        self.editor_save_case("committed_buffer")

    def test_editor_save_unrelated_tracked_note(self):
        self.editor_save_case("tracked_unrelated")

    def test_editor_save_new_journal_note(self):
        self.editor_save_case("new_journal")

    def confirmation_case(self):
        self.env["SYNC_PROOF_AGENT_MODE"] = "confirm"
        secret, leaky = self.scanner_case("control")
        context = {name: self.state.joinpath(name).read_bytes()
                   for name in ("agent.pid", "agent.started", "agent.episode")}
        leaky.unlink()
        self.vault.joinpath("notes/confirmation.md").write_bytes(b"real confirmation must publish this\n")
        Path(str(self.finished) + ".confirm-go").touch()
        confirmation = Path(str(self.finished) + ".confirmation")
        self.wait_for(confirmation.exists, "literal inherited-command confirmation actually runs", seconds=30)
        result = json.loads(confirmation.read_text())
        self.assertEqual(result["code"], 0, "agent's own real confirmation is not a self-skip or failure")
        self.assertTrue(result["stderr"] == "", "confirmation has no private stderr")
        self.assertEqual(len(result["stdout"].splitlines()), 1)
        self.assertTrue(result["stdout"].startswith("sync: synchronized"), "confirmation reports actual synchronization, never skipped")
        self.assertEqual(result["local"], result["remote"], "successful confirmation requires matching local/tracking master")
        self.assertEqual(result["local"], self.sha(self.origin, "master"), "successful confirmation is really published")
        self.assertEqual(self.remote_bytes("notes/confirmation.md"), b"real confirmation must publish this\n")
        self.assertEqual(self.git(self.vault, "log", "-1", "--format=%an <%ae>|%cn <%ce>"),
                         "Configured Sync Author <sync-author@fixture.invalid>|Configured Sync Author <sync-author@fixture.invalid>",
                         "confirmation does not relabel human saves with the inherited remediation identity")
        self.assertTrue(alive(self.receipts()[0]["pid"]), "confirming agent stays alive across the scheduled run")
        self.assertEqual({name: self.state.joinpath(name).read_bytes() for name in context}, context,
                         "confirmation leaves active supervisor PID/lifetime/episode context intact")
        # A fresh unsafe save would immediately request a second agent if the
        # successful confirmation had cleared the still-active lifetime context.
        leaky.write_text(f"later generated scanner fixture: {secret}\n")
        self.sync(0, "skipped")
        self.one_episode()
        self.assertEqual({name: self.state.joinpath(name).read_bytes() for name in context}, context,
                         "scheduled run does not clear the still-live confirming agent")
        self.assertEqual(self.state.joinpath("failures").read_text().strip(), "0", "real confirmation resets the failure count")
        self.wait_for(lambda: time.time() >= result["at"] + 3, "original confirming agent holds for at least three seconds", seconds=5)
        self.assertTrue(alive(self.receipts()[0]["pid"]), "agent remains the only live command for the full hold")
        leaky.unlink()
        self.release.touch()
        self.wait_for(self.finished.exists, "confirming command exits after its hold")
        self.settled_agent()
        self.sync(0, "synchronized")
        self.synchronized(new_episode=True)

    def test_literal_agent_confirmation(self):
        self.confirmation_case()

    def test_agent_timeout_never_skips_after_bound(self):
        self.env.update(SYNC_PROOF_AGENT_MODE="never", DAYBOOK_SYNC_AGENT_TIMEOUT="3")
        self.vault.joinpath("notes/local.md").write_bytes(b"bounded offline work\n")
        self.git(self.vault, "remote", "set-url", "origin", str(self.directory / "unreachable.git"))
        self.sync(1, "failed")
        self.sync(1, "failed")
        stdout = self.sync(1, "escalated")
        self.escalation(stdout)
        record = self.receipts()[0]
        # The supervisor's wall bound, not child exit or a forged lock, releases
        # scheduled synchronization. It is still in its two-second KILL grace.
        self.wait_for(lambda: time.time() >= record["started"] + 4, "fixture passes the three-second agent wall bound", seconds=6)
        self.sync(1, "remediation pending")
        self.wait_for(lambda: Path(str(self.finished) + ".term").exists(), "supervisor sends TERM to its own command")
        self.wait_for(lambda: not alive(record["pid"]), "supervisor KILL ends a command that ignored TERM", seconds=6)
        self.sync(1, "remediation pending")
        self.one_episode()

    def test_installed_copy_ignores_remote_executor_replacement(self):
        self.executable = self.installed
        checkout_script = self.vault / "scripts/sync"
        checkout_script.parent.mkdir()
        checkout_script.write_bytes(self.script.read_bytes())
        checkout_script.chmod(0o700)
        self.commit(self.vault, "fixture: tracked synchronizer")
        self.git(self.vault, "push", "origin", "master")
        self.git(self.other, "pull", "--ff-only", "origin", "master")
        marker = self.directory / "MALICIOUS-CHECKOUT-EXECUTED"
        malicious = (f"#!/bin/sh\nprintf 'unreviewed code ran\\n' > {shlex.quote(str(marker))}\nexit 77\n").encode()
        self.remote_write("scripts/sync", malicious, "fixture: replace remotely tracked executor")
        installed_bytes = self.installed.read_bytes()
        for _ in range(2):
            self.sync(0, "synchronized")
            self.assertFalse(marker.exists(), "scheduled installed invocation never executes pulled checkout code")
            self.assertEqual(checkout_script.read_bytes(), malicious, "real remote update reached the checkout")
            self.assertEqual(self.installed.read_bytes(), installed_bytes, "installed reviewed copy is outside synchronization")
        self.base = self.sha(self.vault)
        self.confirmation_case()
        self.assertFalse(marker.exists(), "literal agent confirmation also uses the installed copy, not pulled scripts/sync")
        self.assertEqual(self.installed.read_bytes(), installed_bytes)

    def test_continued_editor_saves_24_runs(self):
        if not self.slow:
            self.skipTest("select DAYBOOK_SYNC_SLOW=1 drive.sh sync or --slow for the bounded 24-run load")
        target = "journal/2026/10/30.md"
        path = self.vault / target
        path.parent.mkdir(parents=True)
        path.write_bytes(b"synthetic journal load start\n")
        self.commit(self.vault, "fixture: continued-save seed")
        self.git(self.vault, "push", "origin", "master")
        self.env["SYNC_PROOF_LATENCY"] = "1"
        self.watch_files({target: path.read_bytes()})
        stop = threading.Event()
        saved = [path.read_bytes()]

        def writer():
            number = 0
            while not stop.wait(2):
                number += 1
                content = saved[0] + f"synthetic saved line {number}\n".encode()
                temporary = self.directory / "continued-editor.tmp"
                temporary.write_bytes(content)
                with self.watch_lock:
                    self.watch[target] = {saved[0], content}
                    os.replace(temporary, path)
                    saved[0] = content
                    self.watch[target] = {content}

        thread = threading.Thread(target=writer, daemon=True)
        thread.start()
        self.threads.append((stop, thread))
        agent_files = {}
        for number in range(1, 25):
            if number % 3 == 0:
                self.git(self.other, "pull", "--ff-only", "origin", "master")
                remote_path = f"notes/agent-{number}.md"
                content = f"agent push before run {number}\n".encode()
                self.remote_write(remote_path, content)
                agent_files[remote_path] = content
            self.sync(0, "synchronized")
            self.no_agent()
            self.no_operation()
            self.assertEqual(self.state.joinpath("failures").read_text().strip(), "0", "continued saves never fail or escalate")
        stop.set()
        thread.join(timeout=5)
        self.assertFalse(thread.is_alive(), "bounded editor load has stopped")
        self.assertGreater(saved[0].count(b"synthetic saved line"), 0, "real saves overlapped the latency-injected runs")
        self.sync(0, "synchronized")
        self.assertEqual(path.read_bytes(), saved[0], "continued typing never rolls back disk bytes")
        self.assertEqual(self.remote_bytes(target), saved[0], "first quiet run publishes every continued-save byte")
        for remote_path, content in agent_files.items():
            self.assertEqual(self.remote_bytes(remote_path), content, "all eight agent pushes remain published")
        self.synchronized()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--script", type=Path, required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--slow", action="store_true", help="add 24 runs with saves every 2s and real-Git latency of 1s")
    parser.add_argument("--case", action="append", default=[], metavar="SUBSTRING",
                        help="select matching unittest names (repeatable); useful for --case scanner_ baseline rejection")
    args = parser.parse_args()
    if not inside_run(args.run_dir):
        parser.error("--run-dir must resolve below ~/.cache/tmp/verify-daybook-<runid>/")
    SyncJourney.script = args.script.resolve()
    SyncJourney.root = args.run_dir.resolve()
    SyncJourney.slow = args.slow
    names = unittest.defaultTestLoader.getTestCaseNames(SyncJourney)
    if args.case:
        names = [name for name in names if any(selector in name for selector in args.case)]
        if not names:
            parser.error("--case selects no consumer fixtures")
    suite = unittest.TestSuite(SyncJourney(name) for name in names)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
