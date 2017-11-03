if [[ "$#" -ne 1 ]]; then
    echo "Filename required" >&2
    exit 1
fi

if [[ "$1" == "-" ]]; then
    scmd="cat -"
else
    scmd="tailf $1"
fi

$scmd | while read line; do
    error=$(echo $line | grep "tw:log:.*:error]")
    warning=$(echo $line | grep "tw:log:.*:warning]")
    info=$(echo $line | grep "tw:log:.*:info]")
    debug=$(echo $line | grep "tw:log:.*:debug]")
    announce=$(echo $line | grep "tw:log.*:announce]")
    control=$(echo $line | grep "tw:ctrl:")
    event=$(echo $line | grep "tw:event:")
    debugging=$(echo $line | grep "tw:debug:")

    reset="[0m"
    if [[ "$error" ]]; then
        color="[31;1m" # Red
    elif [[ "$warning" ]]; then
        color="[33;1m" # Yellow
    elif [[ "$announce" ]]; then
        color="[35;1m" # Magenta
    elif [[ "$debug" ]]; then
        color="[32;2m" # Dim Green
    elif [[ "$info" ]]; then
        color="[36;1m" # Cyan
    elif [[ "$control" ]]; then
        color="[34;1m" # Blue
    elif [[ "$event" ]]; then
        color="[36;2m" # Dim cyan
    elif [[ "$debugging" ]]; then
        color="[33;2m" # Dim yellow
    else
        color=""
    fi
    echo $color$line$reset
done
