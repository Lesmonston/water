#!/usr/bin/env bash
# Eighth integration, one cargo tree at a time: rules and scan in tree A, the host in tree B, then the service alone
# (it has timing limits). The native window runs later, separately, after the user is told.
R=/f/new/smaltalk/water/.local/w10-integ8/run.sh
$R rules lock check test real:final
$R scan lock check test real:final
$R host lock check test
$R svc lock check test real:final
echo seq done
