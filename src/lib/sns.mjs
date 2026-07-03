import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({});
const TOPIC_ARN = process.env.TOPIC_ARN;

export async function notify(subject, message) {
  await sns.send(new PublishCommand({ TopicArn: TOPIC_ARN, Subject: subject, Message: message }));
}
