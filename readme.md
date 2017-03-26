# Herman
A scalable docker build tool.

## Getting started
The simplest way to get started with this utility is to use the provided
docker-compose file.

```bash
# Clone the repository
git clone https://github.com/AGhost-7/herman

# Move into the repostory directory
cd herman

# Create the directory which will contain the configuration
mkdir config

# Copy the configuration file 
cp sample-config.yml ./config/config.yml

# Edit the file with your favourite text editor
vim config/config.yml

# Specify the environment variable for the secret used by your github webhook.
export HERMAN_GH_SECRET="$(openssl rand -hex 40)"

# Specify the environment variables for logging into dockerhub.
export DOCKER_USERNAME=""
export DOCKER_PASSWORD=""

# Bring up the cluster
docker-compose up -d
```

## Architecture
The design consists of a frontend server which will handle webhooks from
various services. The backend simply implements the code to pull down
the source and build a docker image which will then be pushed over to
a docker registry.

```
front-github    -> { type: 'git' }       -> backend-git
front-gitlab    -> { type: 'git' }       -> backend-git
front-bitbucket -> { type: 'git' }       -> backend-git
front-bitbucket -> { type: 'mercurial' } -> backend-mercurial
```

Data is sent into a work queue using the amqp protocol (rabbitmq) to allow
to scale out more build servers. It is also possible to persist the events
using rabbitmq.
