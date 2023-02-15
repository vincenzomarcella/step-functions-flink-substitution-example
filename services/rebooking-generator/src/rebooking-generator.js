'use strict';

const { randomUUID } = require("crypto");
const { CANCELLATIONS_TABLE_ID, ROZIE_EVENTS_QUEUE_URL, EVENTS_TABLE_ID } = process.env;
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
    const flightID = eventItem.Items[0].flightID
    return flightID
}

const fetchCancellations = async(flightID, nextToken = undefined) => {
    const cancellations = []
    const ddbparams = {
        IndexName: "byFlightID",
        KeyConditionExpression: "flightID = :flightID",
        ExpressionAttributeValues: {
            ":flightID": flightID
        },
        ScanIndexForward: false,
        TableName: CANCELLATIONS_TABLE_ID,
        Limit: 1
    }
    if(nextToken) {
        ddbparams["ExclusiveStartKey"] = nextToken
    }
    const eventItem = await documentClient.query(ddbparams).promise()
    cancellations.push(eventItem.Items)
    if(eventItem.LastEvaluatedKey) {
        const items = await fetchCancellations(flightID, eventItem.LastEvaluatedKey)
        cancellations.push(...items)
    }
    return cancellations
}

const getRandomInt = async(min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.handler = async (event) => {
    const flightID = await fetchLatestFlightCancelled()
    const cancellations = await fetchCancellations(flightID)
    
    const currentDateSeconds = Math.floor(Date.now() / 1000)
    const currentDateISOstring = new Date().toISOString()

    for(let i = 0; i < cancellations.length/10; i++) {
        const num = await getRandomInt(0, cancellations.length-1)
        const cancellation = cancellations[num][0]
        const rebooking = {
            rebookingID: randomUUID(),
            flightID: flightID,
            passengerID: cancellation.passengerID,
            rebookingTime: currentDateISOstring,
            ttl: currentDateSeconds + 600
        }
        const ddbparams = {
            Key: {
                cancellationID: cancellation.cancellationID
            },
            TableName: CANCELLATIONS_TABLE_ID
        }
        await documentClient.delete(ddbparams).promise()

        const sqsparams = {
            MessageBody: JSON.stringify(rebooking),
            QueueUrl: ROZIE_EVENTS_QUEUE_URL
        }
        await sqs.sendMessage(sqsparams).promise()
    }
};
