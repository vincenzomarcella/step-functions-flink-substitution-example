'use strict';

const { randomUUID } = require("crypto");
const { ROZIE_EVENTS_TABLE_ID, EVENTS_TABLE_ID } = process.env;
const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient()
const sqs = new AWS.SQS()

const fetchLatestFlightCancelled = async () => {
    const ddbparams = {
        IndexName: "byEventType",
        KeyConditionExpression: "eventType = :eventType",
        ExpressionAttributeValues: {
            ":eventType": "FLIGHT_CANCELLATION"
        },
        ScanIndexForward: false,
        TableName: EVENTS_TABLE_ID,
        Limit: 1
    }
    const eventItem = await documentClient.query(ddbparams).promise()
    let flightID = undefined
    if (eventItem.Items[0]) flightID = eventItem.Items[0].flightID
    return flightID
}

const fetchCancellationEvents = async (flightID, nextToken = undefined) => {
    const ddbparams = {
        IndexName: "byEventType",
        KeyConditionExpression: "rozieEventType = :rozieEventType",
        ExpressionAttributeValues: {
            ":rozieEventType": "CANCELLATION",
            ":flightID": flightID
        },
        FilterExpression: "flightID = :flightID",
        ScanIndexForward: false,
        TableName: ROZIE_EVENTS_TABLE_ID,
        Limit: 1
    }
    if(nextToken) {
        ddbparams["ExclusiveStartKey"] = nextToken
    }
    const eventItem = await documentClient.query(ddbparams).promise()
    const cancellationEvents = eventItem.Items

    if(eventItem.LastEvaluatedKey) {
        const items = await fetchCancellationEvents(flightID, eventItem.LastEvaluatedKey)
        cancellationEvents.push(...items)
    }
    return cancellationEvents
}

const fetchRebookingEvents = async (flightID, nextToken = undefined) => {
    const ddbparams = {
        IndexName: "byEventType",
        KeyConditionExpression: "rozieEventType = :rozieEventType",
        ExpressionAttributeValues: {
            ":rozieEventType": "REBOOKING",
            ":flightID": flightID
        },
        FilterExpression: "flightID = :flightID",
        ScanIndexForward: false,
        TableName: ROZIE_EVENTS_TABLE_ID,
        Limit: 1
    }
    if(nextToken) {
        ddbparams["ExclusiveStartKey"] = nextToken
    }
    const eventItem = await documentClient.query(ddbparams).promise()
    const rebookingEvents = eventItem.Items

    if(eventItem.LastEvaluatedKey) {
        const items = await fetchRebookingEvents(flightID, eventItem.LastEvaluatedKey)
        rebookingEvents.push(...items)
    }
    return rebookingEvents
}

const fetchCancellationFollowUpEvents = async (flightID, nextToken = undefined) => {
    const ddbparams = {
        IndexName: "byEventType",
        KeyConditionExpression: "rozieEventType = :rozieEventType",
        ExpressionAttributeValues: {
            ":rozieEventType": "CANCELLATION_FOLLOW_UP",
            ":flightID": flightID
        },
        FilterExpression: "flightID = :flightID",
        ScanIndexForward: false,
        TableName: ROZIE_EVENTS_TABLE_ID,
        Limit: 1
    }
    if(nextToken) {
        ddbparams["ExclusiveStartKey"] = nextToken
    }
    const eventItem = await documentClient.query(ddbparams).promise()
    const cancellationFollowUpEvents = eventItem.Items

    if(eventItem.LastEvaluatedKey) {
        const items = await fetchCancellationFollowUpEvents(flightID, eventItem.LastEvaluatedKey)
        cancellationFollowUpEvents.push(...items)
    }
    return cancellationFollowUpEvents
}



module.exports.handler = async (event) => {
    const flightID = await fetchLatestFlightCancelled()
    if (!flightID) return
    const cancellationEvents = await fetchCancellationEvents(flightID)
    const rebookingEvents = await fetchRebookingEvents(flightID)
    const cancellationFollowUpEvents = await fetchCancellationFollowUpEvents(flightID)
    console.debug("FLIGHT ID: " + flightID)
    console.debug("PASSENGERS CANCELLED: " + cancellationEvents.length)
    console.debug("PASSENGERS REBOOKED: " + rebookingEvents.length)
    console.debug("PASSENGERS FOLLOWED UP: " + cancellationFollowUpEvents.length)
};
