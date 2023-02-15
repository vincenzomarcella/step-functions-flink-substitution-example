'use strict';

const { randomUUID } = require("crypto");
const { ROZIE_EVENTS_QUEUE_URL } = process.env;
const AWS = require("aws-sdk");

const sqs = new AWS.SQS()

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    const recordbody = JSON.parse(record.body)
    console.debug("RECORD: ", JSON.stringify(recordbody))
    const cancellationFollowUp = {
      followUpID: randomUUID(),
      followUpTime: new Date().toISOString(),
      flightID: recordbody.flightID.S,
      passengerID: recordbody.passengerID.S
    }
    console.debug("CANCELLATION RECORD: ", JSON.stringify(cancellationFollowUp))
    const sqsparams = {
      MessageBody: JSON.stringify(cancellationFollowUp),
      QueueUrl: ROZIE_EVENTS_QUEUE_URL
    }
    await sqs.sendMessage(sqsparams).promise()
  }
};
