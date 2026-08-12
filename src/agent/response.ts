export function generateAgentResponse(result: any) {
  const action = result.action;
  const asset = action.token ?? "ETH";

  if (result.status === "completed") {
    const execution = result.execution;

    return {
      message:
        `Done. I have sent ${action.amount} ${asset} to ` + `${action.recipientAddress} 🎊.\n\nCheck Tx here -- ${execution?.transactionLink ?? ""}`,

      transaction: {
        hash: execution?.transactionHash,
        link: execution?.transactionLink,
      },
    };
  }

  if (result.status === "simulation_failed") {
    const simulation = result.simulation;

    switch (simulation?.code) {
      case "insufficient_balance":
        return {
          message:
            `I couldn't send ${action.amount} ${asset} because ` +
            `the execution wallet doesn't have enough ${asset}. ` +
            `The transaction was not submitted.`,

          error: {
            code: simulation.code,
            recoverable: false,
          },
        };

      case "invalid_recipient":
        return {
          message:
            "I couldn't send the transaction because the recipient address is invalid.",

          error: {
            code: simulation.code,
            recoverable: false,
          },
        };

      case "unsupported_chain":
        return {
          message: `I can't execute this transaction on chain ${action.chainId}.`,

          error: {
            code: simulation.code,
            recoverable: false,
          },
        };

      default:
        return {
          message:
            simulation?.revertReason ?? "The transaction couldn't be executed.",

          error: {
            code: simulation?.code ?? "SIMULATION_FAILED",

            recoverable: false,
          },
        };
    }
  }

  if (result.status === "checking_execution") {
    return {
      message:
        "The transaction is still being processed. " +
        "I haven't marked it as completed yet.",
    };
  }

  return {
    message: "I wasn't able to complete the transaction.",
  };
}
