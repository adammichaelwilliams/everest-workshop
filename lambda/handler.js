"use strict";

const fs = require("fs");
const fetch = require("node-fetch");
const { Expo } = require("expo-server-sdk");

module.exports.hello = async (event) => {
  //NOTE: Don't store credentials in Git! THIS IS BAD PRACTICE
  //fetch(`https://www.purpleair.com/data.json?show=${stationId}&key=${secretKey}`);
  const secrets = JSON.parse(fs.readFileSync("secrets.json"));

  let pm25now = "";
  let rateLimited = false;

  try {
    const result = await fetch(
      `https://www.purpleair.com/data.json?show=${secrets.STATION_ID}&key=${secrets.SECRET_KEY}`
    );

    const json = await result.json();

    pm25now = json.data[0][1];
  } catch (err) {
    rateLimited = true;
  }

  // Get our push token
  const pushToken = secrets.PUSH_TOKEN;

  //
  const expo = new Expo();

  const message = {
    to: pushToken,
    sound: "default",
    body: `The current PM2.5 reading is: ${pm25now}`,
    data: { pm25now },
  };

  try {
    let ticket = await expo.sendPushNotificationsAsync([message]);
    console.log(ticket);
    // NOTE: If a ticket contains an error code in ticket.details.error, you
    // must handle it appropriately. The error codes are listed in the Expo
    // documentation:
    // https://docs.expo.io/versions/latest/guides/push-notifications#response-format
  } catch (error) {
    console.error(error);
  }

  if (parseFloat(pm25now) > 5.5) {
    //Turn on Air Purifier
    await fetch(
      `https://maker.ifttt.com/trigger/pm_25_level_high/with/key/${secrets.IFTTT_KEY}`
    );
  } else {
    //Turn off Air Purifier
    await fetch(
      `https://maker.ifttt.com/trigger/pm_25_level_low/with/key/${secrets.IFTTT_KEY}`
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `The current PM2.5 reading is: ${pm25now}`,
        input: event,
        pm25now,
        rateLimited,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
