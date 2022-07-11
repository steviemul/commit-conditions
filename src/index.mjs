import core from '@actions/core';
import {context, getOctokit} from '@actions/github';
import multimatch from 'multimatch';

const PULL_REQUEST_EVENT = 'pull_request';
const PUSH_EVENT = 'push';
const SUCCESS = 'true';
const FAIL = 'false';
const OUTPUT_PROPERTY = 'result';

const filterOnPatterns = (paths, patterns, condition) => {

  return paths.filter(path => {
    const matches = multimatch(path, patterns, {dot:true});

    return (matches.includes(path) === condition);
  });
}

const inputToArray = (key) => {

  const value = core.getInput(key);

  return (value !== null && value !== '') ? value.split(',') : [];
};

async function getChangedFiles(base, head) {

  const client = getOctokit(core.getInput('token',
    {required: true}
  ));

  const response = await client.rest.repos.compareCommits({
    base,
    head,
    owner: context.repo.owner,
    repo: context.repo.repo
  });

  if (response.status !== 200) {
    core.setFailed(`Error comparing commit. Client returned status code ${response.status}`);
  }

  return response.data.files.map(f => f.filename);
}

async function getCommit(ref) {

  const client = getOctokit(core.getInput('token',
    {required: true}
  ));

  const response = await client.rest.repos.getCommit({
    ref,
    owner: context.repo.owner,
    repo: context.repo.repo
  });

  if (response.status !== 200) {
    core.setFailed(`Error comparing commit. Client returned status code ${response.status}`);
  }

  return response.data;
}

async function getChangeInformation(context) {

  const details = {
    message: '',
    files: []
  };

  switch (context.eventName) {
    case PULL_REQUEST_EVENT: {
      details.files = await getChangedFiles(
        context.payload.pull_request?.base?.sha,
        context.payload.pull_request?.head?.sha
      );

      details.message = context.payload.pull_request?.head_commit?.message;
      break;
    }
    case PUSH_EVENT: {
      details.files = await getChangedFiles(
        context.payload.before,
        context.payload.after
      );
      details.message = context.payload?.head_commit?.message;
      break;
    }
    default: {
      const commit = await getCommit(context.payload.ref);
      details.files = commit.files?.map(f => f.filename);
      details.message = commit.commit?.message;
      break;
    }
  }

  return details;
}

async function run() {

  try {
    
    const successCommitMessage = core.getInput('success-commit-message');
    const failCommitMessage = core.getInput('fail-commit-message');

    const includes = inputToArray('includes');
    const excludes = inputToArray('excludes');

    core.debug(`Includes ${includes.length}`);
    core.debug(`Excludes ${excludes.length}`);

    core.debug(JSON.stringify(context, null, 2));

    const {message, files} = await getChangeInformation(context);

    if (successCommitMessage && message.includes(successCommitMessage)) {
      core.info(`Returning ${SUCCESS} based on commit message containing ${successCommitMessage}`);
      core.setOutput(OUTPUT_PROPERTY, SUCCESS);
      return;  
    }
    else if (failCommitMessage && message.includes(failCommitMessage)) {
      core.info(`Returning ${FAIL} based on commit message containing ${failCommitMessage}`);
      core.setOutput(OUTPUT_PROPERTY, FAIL);
      return;
    }

    let filteredPaths = files;

    core.info(`Changed paths : ${files}`);

    if (includes.length > 0) {
      filteredPaths = filterOnPatterns(filteredPaths, includes, true);
    }

    if (excludes.length > 0) {
      filteredPaths = filterOnPatterns(filteredPaths, excludes, false);
    }

    core.info(`Filtered paths : ${filteredPaths}`);

    const result = (filteredPaths.length > 0) ? SUCCESS : FAIL;

    core.info(`Returning result : ${result}`);

    core.setOutput(OUTPUT_PROPERTY, result);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();