import mongoose, {
  Schema,
  type InferSchemaType
} from "mongoose";

const TaskSchema = new Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    userMessage: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        "planning",
        "simulating",
        "simulation_failed",
        "executing",
        "checking_execution",
        "completed",
        "failed"
      ],
      required: true,
      index: true
    },

    action: {
      type: Schema.Types.Mixed
    },

    simulation: {
      type: Schema.Types.Mixed
    },

    executionId: {
      type: String,
      index: true
    },

    transactionHash: {
      type: String,
      index: true
    },

    transactionLink: {
      type: String
    },

    error: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type TaskDocument =
  InferSchemaType<typeof TaskSchema> & {
    taskId: string;
  };

export const Task = mongoose.model(
  "Task",
  TaskSchema
);