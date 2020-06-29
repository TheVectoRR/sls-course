import { getAuctionById } from './get-auction';
import { uploadPictureToS3 } from '../lib/upload-picture-to-s3';
import { setAuctionPictureUrl } from '../lib/set-auction-picture-url';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';

export async function uploadAuctionPicture(event) {
  const { id } = event.pathParameters;
  const { email } = event.requestContext.authorizer;
  const auction = await getAuctionById(id);

  if(auction.seller !== email) {
    throw new createError.Forbidden('You are not the seller of this auction!');
  }

  // TODO: should verify that this is an valid base 64 picture
  const base64 = event.body.replace(/^data:image\/\w+;base64,/,'');
  const buffer = Buffer.from(base64, 'base64');

  let updatedAuction;

  try {
    const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer);
    updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler());