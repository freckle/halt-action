import * as core from "@actions/core";

async function run() {
  try {

    core.startGroup("Inputs");
    const token = core.getInput("github-token", { required: true });
    core.info("Action loaded")

  } catch (error) {
    if (error instanceof Error) {
      core.error(error);
      core.setFailed(error.message);
    } else if (typeof error === "string") {
      core.error(error);
      core.setFailed(error);
    } else {
      core.error("Non-Error exception");
      core.setFailed("Non-Error exception");
    }
  }
}

run();
