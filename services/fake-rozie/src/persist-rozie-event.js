'use strict';

const AWS = require("aws-sdk");
const { ROZIE_EVENTS_TABLE_ID } = process.env;

const documentClient = new AWS.DynamoDB.DocumentClient()

module.exports.handler = async (event) => {

  for (const record of event.Records) {
    //console.debug("RECORD: ", JSON.stringify(record))
    const eventBody = JSON.parse(record.body)
    let eventType, eventID, eventTime;
    if('cancellationID' in eventBody) {
      eventID = eventBody.cancellationID
      eventTime = eventBody.cancellationTime
      eventType = 'CANCELLATION'
    } else if('rebookingID' in eventBody) {
      console.debug("RECORD: ", JSON.stringify(record))
      eventID = eventBody.rebookingID
      eventTime = eventBody.rebookingTime
      eventType = 'REBOOKING'
    } else if('followUpID' in eventBody) {
      console.debug("RECORD: ", JSON.stringify(record))
      eventID = eventBody.followUpID
      eventTime = eventBody.followUpTime
      eventType = 'CANCELLATION_FOLLOW_UP'
    }
    const eventItem = {
      flightID: eventBody.flightID,
      passengerID: eventBody.passengerID,
      rozieEventTime: eventTime,
      rozieEventType: eventType,
      rozieEventID: eventID,
    }
    const ddbparams = {
      Item: eventItem,
      TableName: ROZIE_EVENTS_TABLE_ID
    }
    await documentClient.put(ddbparams).promise()
  }
};
