import AWS from 'aws-sdk';
import commonMiddleware from '../lib/common-middleware';
import createError from 'http-errors';
import { getAuctionById } from './get-auction';
import placeBidSchema from '../lib/schemas/place-bid-schema';
import validator from '@middy/validator';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
    const { id } = event.pathParameters;
    const { amount } = event.body;
    const { email } = event.requestContext.authorizer;

    const auction = await getAuctionById(id);

    if (email === auction.seller) {
        throw new createError.Forbidden(`You cannot bid on your own auction!`);
    }

    if (email === auction.highestBid) {
        throw new createError.Forbidden(`You cannot bid on your own auction!`);
    }

    if (auction.status !== 'OPEN') {
        throw new createError.Forbidden(`You can bid only on OPEN bids`);
    }

    if (amount <= auction.highestBid.bidder) {
        throw new createError.Forbidden(`You are already the highest bidder!`);
    }

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
        ExpressionAttributeValues: {
            ':amount': amount,
            ':bidder': email,
        },
        returnValues: 'ALL_NEW',
    };

    let updatedAuction;

    try {
        const result = await dynamodb.update(params).promise();
        updatedAuction = result.Attributes;
    } catch (error) {
        console.error(error);
        throw new createError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(updatedAuction),
    };
}

export const handler = commonMiddleware(placeBid)
    .use(validator({ inputSchema: placeBidSchema }));


