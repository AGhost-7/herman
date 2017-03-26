tmux split-window -dh 'docker run --rm --name rabbitmq --net=dev rabbitmq'
docker run --rm --name registry --net=dev registry:2
