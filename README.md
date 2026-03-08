# AWS Task Manager

Small Node.js web app for deployment on AWS EC2 with DynamoDB.

## Features
- Add task
- View tasks
- Delete task

## Requirements
- Node.js installed
- DynamoDB table named `Tasks`
- Primary key: `taskId` (String)

## Run locally
```bash
npm install
npm start
