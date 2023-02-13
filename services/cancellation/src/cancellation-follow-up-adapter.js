'use strict';

const { randomUUID } = require("crypto");
const { ROZIE_EVENTS_QUEUE_URL } = process.env;
const AWS = require("aws-sdk");

const sqs = new AWS.SQS()

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    console.debug("RECORD: ", JSON.stringify(record))
    const cancellationFollowUp = {
      followUpID: randomUUID(),
      followUpTime: new Date().toISOString(),
      flightID: record.flightID.S,
      passengerID: record.passengerID.S
    }
    const sqsparams = {
      MessageBody: JSON.stringify(cancellationFollowUp),
      QueueUrl: ROZIE_EVENTS_QUEUE_URL,
      MessageGroupId: "flightdeletefollowup",
      MessageDeduplicationId: record.passengerID.S
    }
    await sqs.sendMessage(sqsparams).promise()
  }
};
