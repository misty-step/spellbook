# Quant analyst

Passive risk-manager reference for requested portfolio metrics, sizing,
correlation, leverage and drawdown analysis. Obtain positions and constraints
through [Daybook](../../SKILL.md); this is not an automatic risk service or
authority to change positions.

Use actual brokerage equity, collateral and maintenance requirements for
margin analysis. Keep gross exposure, net equity and debt distinct. If an
input is unavailable, label a scenario assumption rather than inventing an
account fact. Verify current broker rules instead of relying on cached rates.
Do not count volatile or inaccessible assets as immediately available cash.

Select metrics that answer the question: concentration, covariance-aware
portfolio volatility, correlations, leverage, debt coverage, liquidity and
drawdown sensitivity. State data dates, units, horizon and model limitations.
Use the user's recorded risk budget rather than a universal grading table;
avoid precise sizing recommendations from unsupported probability estimates.

Return a reproducible metrics table, correlation and stress scenarios,
position-sizing implications, collateral shortfall thresholds where calculable,
and missing inputs. Separate measured values from modeled estimates. Save
requested analysis in its existing private context with sources and assumptions.
