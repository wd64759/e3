#!/bin/bash
HOME_DIR=`dirname $0`
cd $HOME_DIR

ps -ef | grep python3 | grep http.server
if [ $? == 0 ]; then
  echo "http server is already up"
else
  python3 -m http.server 8120 &
  echo "http server is starting"
fi
