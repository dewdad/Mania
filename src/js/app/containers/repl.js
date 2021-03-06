// base
import React from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import _ from "js/utils";

// app
import { getCurrents, payloadInResponseContext } from "js/globals";
import { THEME } from "js/app/constants";
import JSONTree from "react-json-tree";
import Icon from "js/app/components/icon";
import Editor from "js/app/components/editor";
import Curl from "js/app/components/curl";

// styles
import "scss/containers/repl";

// JSONTree customisation
THEME.base0D = "#666666";
const getItemString = (type, data, itemType, itemString) => <span>{itemType}</span>;
const shouldExpandNode = (keyName, data, level) => {
  let ret = false;
  if (Array.isArray(data) && data.length > 10) ret = false; // if [] > 10 items
  else if (typeof data === "object" && Object.keys(data).length > 10) ret = false; // if {} > 10 items
  else ret = true;
  return ret;
};

const constructCURL = (method, url, payload, prevResponse) => {
  method = method.toUpperCase();

  let payloadInContext;
  try {
    payloadInContext = payloadInResponseContext(payload, prevResponse); // modify payload in context of previous response
  } catch (e) {
    payloadInContext = {};
  }

  payload = method === "GET" ? _.queryParams(payloadInContext) : JSON.stringify(payloadInContext);

  if (method === "GET" && payload) url += `?${payload}`;

  let curl = `curl -X ${method} ${url} -H 'cache-control: no-cache' -H 'content-type: application/json'`;

  if (method === "POST" && payload) {
    payload = payload.replace(/\s{2,}|\n/g, " ");
    curl += ` -d '${payload}'`;
  }

  return curl;
};

const mapStateToProps = (state = {}) => {
  const { step } = getCurrents(state, false);
  const { query: queryCount, step: stepCount } = getCurrents(state);

  let
    response,
    modified = false,
    error;

  let prevResponse = stepCount === 0 ? "" : state.queries[queryCount].steps[stepCount - 1].response.text;

  if (step.evaluation.response) {
    try {
      prevResponse = prevResponse === "" ? {} : JSON.parse(prevResponse);
      response = step.evaluation.response;
      modified = true;
    } catch (e) {
      error = e.toString();
      response = null;
    }
  } else {
    try {
      response = step.response.text ? JSON.parse(step.response.text) : null;
    } catch (e) {
      error = e.toString();
      response = null;
    }
  }

  return {
    method: step.method,
    url: step.url,
    payload: step.payload,
    error,
    response,
    status: step.response.status,
    time: step.response.time,
    fetching: step.fetching,
    assertions: step.evaluation.assertions,
    modified,
    prevResponse,
  };
};

// get current step status
const currentStatus = (response, error, modified, fetching) => {
  let
    label = null,
    classes = null;

  if (modified) label = "Response is modified";
  if (error) label = error;
  if (fetching) label = "Fetching API ...";
  if (!fetching && !response) label = "Click the Step button or ⌘+Enter to execute";

  classes = classnames("meta-info", "info", { modified, error, fetching, empty: !fetching && !response });

  return label && classes && <span className={classes}><Icon type="info" />{label}</span>;
};

// render
const Repl = ({ method, url, payload, response, status, time, assertions, error, modified, fetching, prevResponse }) => (
  <div id="repl">
    {!fetching && response && assertions.length > 0 && (
      <div className="response-actions">
        {assertions.map((assert, idx) => {
          return <span key={idx} className={classnames("status", "assertion", String(assert[0]))}>
            {assert[1]}
            <span className="label result">&nbsp;{assert[0] ? "succeeded" : "failed"}</span>
          </span>;
        })}
      </div>
    )}

    {!fetching && response && <JSONTree data={response} theme={THEME} getItemString={getItemString} shouldExpandNode={shouldExpandNode} hideRoot />}

    <div className="response-meta">
      {currentStatus(response, error, modified, fetching)}
      {!fetching && response && (
        <span className={classnames("meta-info", "status", `s${parseInt(status/100)}xx`)}><span className="label">status</span>{status}</span>
      )}
      {!fetching && response && (
        <span className={classnames("meta-info", "time", { good: time <= 500, medium: 500 < time <= 2000, bad: time > 2000 })}><span className="label">time</span>{time}<span className="label units">ms</span></span>
      )}
    </div>

    {!fetching && response && !error && <Curl value={constructCURL(method, url, payload, prevResponse)} />}
  </div>
);

export default connect(
  mapStateToProps,
)(Repl);
