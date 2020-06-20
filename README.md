# "Automating Air Quality"

### Everest 2020 Workshop

## Prerequisites

- [AWS Account](https://portal.aws.amazon.com/billing/signup?nc2=h_ct&src=header_signup&redirect_url=https%3A%2F%2Faws.amazon.com%2Fregistration-confirmation#/start)
- [Node v12.X.X](https://nodejs.org/en/download/) or above
- Serverless framework [setup](https://www.serverless.com/framework/docs/providers/aws/guide/quick-start/) and [configured with AWS](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/)
- PurpleAir device [connected to wifi and registered online](https://www2.purpleair.com/pages/install)
- [WEMO Smart Plug](https://www.belkin.com/us/p/P-F7C063/) connected to the WEMO iOS or Android app
- [IFTTT Account](https://ifttt.com/)

## Background

The prompt for the Everest 2020 hackathon is to "build something that automates a task in your daily life" - great!

As someone who has lived in a variety of buildings in San Francisco, old and new, I've experienced my fair share of new paint fumes, old building smells and humidity-based mold. Fortunately, I've largely avoided any long term situations with these, but I'm still cautious! Additionally, the Bay Area, although usually having great air quality, has been overcome with wildfire related pollution for at least one day of the year, the past two years.

Based on these factors, I've invested in air quality monitors. The air quality monitors have turned out to be more useful than I could have imagined! For example, when cooking or cleaning, it's very easy to fill the air with pollutants. Frying something in the kitchen, or giving the bathroom a deep clean, can really cause your head to spin if you're not careful! Luckily, the sensors are helpful in alerting me to bad air quality. I mostly use them indoors, but will eventually place some outside as well.

### Problem

Though the sensors are helpful, they currently require me to look at them. As they're relatively static in the house (entryway and office) it's not always easy to remember to look at them. I often find that I only look at them when I suspect the air to be bad already.

Wouldn't it be neat if I could be automatically alerted when the air quality was particularly bad?

In these cases, I could turn on my air purifier (automatically) or even open up my windows (less automatic, but still useful).

### Solution

Let's automate this!

#### Prior Art

There appear to be a variety of scripts to handle reading data from the sensors I own, however there doesn't seem to be a decent solution for interacting with all of the sensors. Additionally, most of the solutions just send data to Homekit, AWS SNS or SMS.

#### Issues

While decent options, I want to receive a push notification of my data. It would be nice to extend my "app" to handle data from multiple sensors and allow me to look at the history, as well as control my air purifiers remotely. Before we get ahead of ourselves, let's get data flowing :)

#### Other options

It's tempting to try and combine a series of existing services together to reach the intended effect (push notification at some pollution threshold) however this solution, while undoubtedly durable, is much less extensible. Additionally, any durability is baked into the existing services themselves. I was initially tempted to tie IFTTT and Apple Shortcuts (based on Workflow) together, but this solution has already broken once, [after Workflow became Apple Shortcuts](https://medium.com/@flat/making-ifttt-work-with-apples-new-shortcuts-app-5530e50d4527). The new solutions look brittle and less fun, especially for a workshop!

## Getting Started

### What are we measuring?

We'll start with just one sensor: the [PurpleAir PA-I-Indoor](https://www2.purpleair.com/products/purpleair-pa-i-indoor). This sensor is meant for indoor use and measures real-time [PM2.5 concentrations](https://laqm.defra.gov.uk/public-health/pm25.html). _PM_ in PM2.5 stands for "particulate matter" and _2.5_ refers to the diameter of particles in the air at less than 2.5 micrometers. PM2.5 is a measure of the mass of those particles per cubic meter of air.

The following table outlines the different PM2.5 averages over a 24-hour period and their associated AQI:

| PM2.5 (μg/m 3) | Air Quality Index (AQI)                   |
| -------------- | ----------------------------------------- |
| 0 to 12.0      | Good 0 to 50                              |
| 12.1 to 35.4   | Moderate 51 to 100                        |
| 35.5 to 55.4   | Unhealthy for Sensitive Groups 101 to 150 |
| 55.5 to 150.4  | Unhealthy 151 to 200                      |
| 150.5 to 250.4 | Very Unhealthy 201 to 300                 |
| 250.5 to 500.4 | Hazardous 301 to 500                      |

[Source](https://blissair.com/what-is-pm-2-5.htm)

NOTE: For reference, the current _AQI_ in San Francisco is 25, which is "Good". Note: AQI and PM2.5, although similar have a nonlinear relationship. The former (AQI) is based off the latter (PM2.5), and different organizations calculate AQI slightly differently.

### The data

Our PurpleAir device connects to the cloud over wifi, and uploads all of it's data to the PurpleAir service. There are additional options for sending data to [Weather Underground](https://www.wunderground.com/), among other sites. Although we could hack the device and keep the data within our network, for the sake of speed we're going to use PurpleAir's API.

The [PurpleAir API](https://www2.purpleair.com/community/faq#!hc-access-the-json) is quite simple, and can be accessed using the following url pattern:

```
https://www.purpleair.com/data.json?show={ID}&key={SECRET_KEY}
```

NOTE: By default, the sensor data is public, but because this sensor is used indoors, I've opted to keep the data "private" - therefore the `key` field is needed as a URL parameter.

To query our sensors data, we can simply run:

```shell
curl https://www.purpleair.com/data.json?show={ID}&key={SECRET_KEY}
```

and we receive:

```json
{
  "version": "7.0.10",
  "fields": [
    "ID",
    "pm",
    "age",
    "pm_0",
    "pm_1",
    "pm_2",
    "pm_3",
    "pm_4",
    "pm_5",
    "pm_6",
    "conf",
    "pm1",
    "pm_10",
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
    "Humidity",
    "Temperature",
    "Pressure",
    "Elevation",
    "Type",
    "Label",
    "Lat",
    "Lon",
    "Icon",
    "isOwner",
    "Flags",
    "Voc",
    "Ozone1",
    "Adc",
    "CH"
  ],
  "data": [
    [
      55567,
      10.2,
      0,
      10.2,
      12.1,
      12.8,
      16.5,
      17.3,
      7.1,
      1.2,
      97,
      6.6,
      11.3,
      1382.1,
      387.4,
      65.6,
      5.2,
      1.2,
      1.2,
      33,
      83,
      1012.96,
      18,
      1,
      "Meta Haus Inside",
      37.75,
      -122.42,
      0,
      0,
      0,
      null,
      null,
      0.04,
      1
    ]
  ],
  "count": 1
}
```

Admittedly not the prettiest JSON, but it'll do!

### Accessing the data

Great! We have data, now let's create a system to poll that data at some interval.

We have quite a few options for this, from running a server in the cloud to running a Raspberry Pi locally. For now, let's stick to "free" options.

AWS provides [1 million "free" Lambda requests per month](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsm.page-all-free-tier=1), though the fine print notes that this is limited to `3.2 million seconds` of compute time.

If we query our sensor every 5 minutes, that gives us 12 reads per hour, for 24 hours a day for ~30 days. That's ~8700 requests/month,
t up to ~367 seconds per request. Without looking further into the limits of the free tier (always do your due diligence! AWS bills can get high quickly!), we'll assume that this is sufficient for our use case.

NOTE: The devil is always in the details, AWS Lambda is _"free"_ but charges `$0.09/GB` for outbound traffic to the public internet. Because we'll be using our Lambda to trigger a push notification, this option is more expensive than we'd hope. [Pricing breakdown](https://www.serverless.com/aws-lambda/#pricing)

#### Writing our Lambda

To make things easy, we're going to use the [Servless Framework](https://www.serverless.com/framework/docs/) to setup, test and deploy our Lambda functions to AWS.

Note: Ensure you've installed and setup Serverless with your AWS account as specified [here](https://www.serverless.com/framework/docs/providers/aws/guide/quick-start/).

Starting with the initial example handler:

```javascript
module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Go Serverless v1.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
```

Install `node-fetch`

```shell
npm i node-fetch --save
```

Update our function to query the PurpleAir endpoint:

```javascript
const result = await fetch(
  `https://www.purpleair.com/data.json?show=${stationId}&key=${secretKey}`
);
const json = await result.json();
```

Grab the current PM2.5 reading

```javascript
const pm25now = json.data[0][1];
```

Update our response JSON

```javsacript
return {
  statusCode: 200,
  body: JSON.stringify(
    {
      message: `The current PM2.5 reading is: ${pm25now}`,
      input: event,
    },
    null,
    2
  ),
}
```

#### Deploying our Lambda

Great, now that we've written our Lambda, we could test locally... but YOLO! Let's deploy!

```shell
serverless deploy
```

Once it's deployed, we can test it:

```shell
serverless invoke -f hello
```

You should see a response similar to:

```shell
{
    "statusCode": 200,
    "body": "{\n  \"message\": \"The current PM2.5 reading is: 1.5\",\n  \"input\": {},\n}"
}
```

Success!

### Building a mobile app

An entire app is 100% overkill for this project (we could use [IFTTT](https://ifttt.com/)), but we're trying to set ourselves up for an extensible solution that will allow us to do more with our data than just receive a push notification.

Additionally, we could use something like Apple Shortcuts, but then our solution would not be cross-platform. Maybe there's a simple solution that both iOS and Android OSes support, but I'm not aware of it.

Enter React Native w/Expo

#### Setup Expo and start sample app

Install Expo

```shell
npm install expo-cli --global
```

Create our project

```shell
expo init app
```

We'll choose the "Bare" app

Start our App

```shell
cd app
expo start
```

Note: Sample app with `expo@37.0.12` causes a missing font exception on iOS (not Android). Quick fix is to remove `space-mono` font style from `components/StyledText.js`

Test the app

- Type `i` into the shell for the iOS simulator (MacOS only) or `a` into the shell for the Android Studio simulator

Success!

#### Add Push Notifications

We're going to hack in push notifications for a single device; let's get started by replacing our `App.js` file with the Expo Snack from their [push notifications overview page](https://docs.expo.io/guides/push-notifications/).

Once we've replaced our `App.js` with the push notification, let's try receiving a push notifications on our device.

Note: When building a standalone app, outside of Expo, you'll need to provision push notificaiton credentials with [Firebase Cloud Messaging](https://docs.expo.io/guides/using-fcm).

Now let's take our Expo push notification token that was printed to our React Native logs. It should look something like this:

```shell
ExponentPushToken[aDFZl5O5Fic7qrZ4C2P0iH]
```

Great! Let's save that for later.

#### TODO Show current AQI based on sensor data

### Connecting our Lambda to our Mobile App

Now that we have a lambda that can query our sensor, and an app that can receive push notifications, let's connect them together!

#### Add Push Notification sending to our Lambda

We're going to use [expo-server-sdk-node](https://github.com/expo/expo-server-sdk-node) to send push notifications to our mobile app. Let's add it to our Lambda.

Install `expo-server-sdk` (Note: sans `-node`)

```shell
npm i expo-server-sdk-node --save
```

In our Lambda function, add the following code before the handler returns:

```javascript
// Get our push token
const pushToken = "ExponentPushToken[aDFZl5O5Fic7qrZ4C2P0iH]";

// Initialize Expo client
const expo = new Expo();

const message = {
  to: pushToken,
  sound: "default",
  body: `The current PM2.5 reading is: ${pm25now}`,
  data: { pm25now },
};

try {
  await expo.sendPushNotificationsAsync([message]);
} catch (error) {
  console.error(error);
}
```

Now let's test it

```shell
serverless deploy
serverless invoke -f hello
```

Your phone should get an alert with the current PM2.5 reading!

### Connecting our Lambda to our Air Purifier

#### Smart Plugs

To control the air purifier, we're going to connect it to a smart plug. For the sake of this demo, we won't walk through all of the steps to connect your smart plug to a webhook, but the following resources will be helpful if you have a WEMO Smart Plug.

1. [Connect your WEMO Switch to the cloud](https://www.belkin.com/us/support-article?articleNum=268606)
2. [Connect your WEMO Switch to IFTTT](https://ifttt.com/wemo_switch)
3. [Setup a webhook for turning _ON_ the switch](https://ifttt.com/applets/464008p-http-to-switch-on-wemo-switch)
4. [Setup a webhook for turning _OFF_ the switch](https://ifttt.com/applets/464007p-http-to-switch-off-wemo-switch)

Once those prerequisites are complete, you'll have two IFTTT events that you can call

I've named mine:

1. `pm_25_level_high` to turn on the switch
2. `pm_25_level_low` to turn off the switch

We can then test these webhooks using the following commands:

```shell
curl -X POST https://maker.ifttt.com/trigger/pm_25_level_high/with/key/{IFTTT_KEY}
```

```shell
curl -X POST https://maker.ifttt.com/trigger/pm_25_level_low/with/key/{IFTTT_KEY}
```

#### Connect these calls to your Lambda

After the Expo Push notification code, and before we return from the function handler, we want to add the following Javascript:

```javascript
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
```

Note: be sure to replace the event names with your own!
