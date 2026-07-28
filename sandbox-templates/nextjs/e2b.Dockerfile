# You can use most Debian-based base images
FROM node:22-slim
# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@15.3.3 . --yes

RUN npm install -D tw-animate-css

RUN npx --yes shadcn@4.16.0 init --defaults --yes --force
RUN npx --yes shadcn@4.16.0 add --all --yes

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

WORKDIR /home/user