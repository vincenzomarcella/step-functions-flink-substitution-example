'use strict';

const { randomUUID } = require("crypto");
const { CANCELLATIONS_TABLE_ID, ROZIE_EVENTS_QUEUE_URL, EVENTS_TABLE_ID, CANCELLATION_FOLLOW_UP_SFN_ARN } = process.env;
const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient()
const sqs = new AWS.SQS()
const stepFunctions = new AWS.StepFunctions()

module.exports.handler = async (event) => {
  const flightID = "AC" + (Math.floor(Math.random()*1000)).toString()

  const cancellations = []
  const currentDateSeconds = Math.floor(Date.now()/1000)
  const currentDateISOstring = new Date().toISOString()
  
  for (let i = 0; i < 100; i++) {
    const passengerID = randomUUID()
    const cancellation = {
      cancellationID: randomUUID(),
      flightID: flightID,
      passengerID: passengerID,
      cancellationTime: currentDateISOstring,
      ttl: currentDateSeconds + 600
    }
    cancellations.push(cancellation)

    const ddbparams = {
      Item: cancellation,
      TableName: CANCELLATIONS_TABLE_ID
    }
    await documentClient.put(ddbparams).promise()

    const sqsparams = {
      MessageBody: JSON.stringify(cancellation),
      QueueUrl: ROZIE_EVENTS_QUEUE_URL,
    }
    await sqs.sendMessage(sqsparams).promise()
  }

  const flightEvent = {
    eventID: randomUUID(),
    eventTime: currentDateISOstring,
    eventType: "FLIGHT_CANCELLATION",
    flightID: flightID
  }

  const ddbparams = {
    Item: flightEvent,
    TableName: EVENTS_TABLE_ID
  }
  await documentClient.put(ddbparams).promise()

  const waitUntil = new Date((currentDateSeconds + 240) * 1000).toISOString()
  const cancellationIDs = cancellations.map(a => a.cancellationID)
  const sfnparams = {
    stateMachineArn: CANCELLATION_FOLLOW_UP_SFN_ARN,
    input: JSON.stringify({
      waitUntil: waitUntil,
      cancellationIDs: cancellationIDs
    })
  }
  //console.debug("SFN ARN: ", CANCELLATION_FOLLOW_UP_SFN_ARN)
  await stepFunctions.startExecution(sfnparams).promise()
};
