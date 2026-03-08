const express = require("express");
const crypto = require("crypto");
const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand
} = require("@aws-sdk/lib-dynamodb");

const app = express();
const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.TABLE_NAME || "Tasks";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const client = new DynamoDBClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(client);

function pageTemplate(tasks = [], message = "") {
  const rows = tasks.length
    ? tasks.map(
        (task) => `
          <tr>
            <td>${task.taskId}</td>
            <td>${task.title}</td>
            <td>${task.status}</td>
            <td>
              <form method="POST" action="/delete/${task.taskId}" style="display:inline;">
                <button type="submit">Delete</button>
              </form>
            </td>
          </tr>
        `
      ).join("")
    : `<tr><td colspan="4">No tasks found</td></tr>`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Task Manager App</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 40px;
        background: #f5f5f5;
      }
      .container {
        max-width: 900px;
        margin: auto;
        background: white;
        padding: 24px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      h1 { margin-top: 0; }
      form {
        margin-bottom: 20px;
      }
      input, select, button {
        padding: 10px;
        margin: 6px 0;
        width: 100%;
        box-sizing: border-box;
      }
      button {
        background: black;
        color: white;
        border: none;
        cursor: pointer;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      table, th, td {
        border: 1px solid #ddd;
      }
      th, td {
        padding: 12px;
        text-align: left;
      }
      .msg {
        color: green;
        font-weight: bold;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .small {
        color: #666;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="topbar">
        <div>
          <h1>Task Manager App</h1>
          <p class="small">Running on AWS EC2 + DynamoDB</p>
        </div>
      </div>

      ${message ? `<p class="msg">${message}</p>` : ""}

      <h2>Add New Task</h2>
      <form method="POST" action="/add">
        <input type="text" name="title" placeholder="Enter task title" required />
        <select name="status" required>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button type="submit">Add Task</button>
      </form>

      <h2>All Tasks</h2>
      <table>
        <thead>
          <tr>
            <th>Task ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </body>
  </html>
  `;
}

app.get("/", async (req, res) => {
  try {
    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    const tasks = data.Items || [];
    res.send(pageTemplate(tasks));
  } catch (error) {
    res.status(500).send(`
      <h1>Error loading tasks</h1>
      <pre>${error.message}</pre>
      <p>Check AWS region, IAM role, and DynamoDB table name.</p>
    `);
  }
});

app.post("/add", async (req, res) => {
  try {
    const { title, status } = req.body;

    const task = {
      taskId: crypto.randomUUID(),
      title: title.trim(),
      status: status.trim()
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: task
      })
    );

    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    res.send(pageTemplate(data.Items || [], "Task added successfully."));
  } catch (error) {
    res.status(500).send(`
      <h1>Error adding task</h1>
      <pre>${error.message}</pre>
    `);
  }
});

app.post("/delete/:id", async (req, res) => {
  try {
    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          taskId: req.params.id
        }
      })
    );

    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    res.send(pageTemplate(data.Items || [], "Task deleted successfully."));
  } catch (error) {
    res.status(500).send(`
      <h1>Error deleting task</h1>
      <pre>${error.message}</pre>
    `);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
