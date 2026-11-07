#!/usr/bin/env bash
# Ninth integration, one cargo tree at a time: the changed packages and the UI in tree A, the host in tree B,
# then the service alone (it has timing limits). The native window and the folder picker run later, separately,
# after the user is told.
R=/f/new/smaltalk/water/.local/w11-integ9/run.sh
$R exec lock check test real:final
$R rules lock check test real:final
$R scan lock check test real:final
$R decl lock check test real:final
$R dup lock check test real:final
$R ui check test browser
$R host lock check test
$R svc lock check test real:final
echo seq done
