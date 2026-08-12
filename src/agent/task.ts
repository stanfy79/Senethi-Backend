import crypto from "node:crypto";
import { Task } from "../models/task.js";

export type TaskStatus =
  | "planning"
  | "simulating"
  | "executing"
  | "completed"
  | "failed";

export async function createTask(
  userMessage: string
) {
  const taskId =
    `agent-${crypto.randomUUID()}`;

  const task = await Task.create({
    taskId,
    userMessage,
    status: "planning"
  });

  return task;
}

export async function updateTask(
  taskId: string,
  update: Partial<{
    status: TaskStatus;
    action: unknown;
    simulation: unknown;
    executionId: string;
    transactionHash: string;
    transactionLink: string;
    error: unknown;
  }>
) {
  const task =
    await Task.findOneAndUpdate(
      { taskId },
      { $set: update },
      {
        new: true,
        runValidators: true
      }
    );

  if (!task) {
    throw new Error(
      `Task ${taskId} not found`
    );
  }

  return task;
}

export async function getTask(
  taskId: string
) {
  return Task.findOne({
    taskId
  }).lean();
}

export async function listTasks(
  limit = 50
) {
  return Task.find()
    .sort({
      createdAt: -1
    })
    .limit(limit)
    .lean();
}