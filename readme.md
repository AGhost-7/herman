# Herman
A scalable docker build tool.

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
