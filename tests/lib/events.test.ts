import assert from "node:assert/strict"
import test from "node:test"

import {
  getEventSelection,
  getNotificationConfigKey,
  getNotificationType,
  toS3Events,
  updateNotificationRule,
  type NotificationItem,
} from "../../lib/events"

const subscription = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "sub-a",
  sourceId: "sub-a",
  type: "SQS",
  arn: "arn:rustfs:sqs:us-east-1:primary:webhook",
  events: ["s3:ObjectCreated:*"],
  prefix: "a/",
  ...overrides,
})

test("event selections round-trip through the stored S3 event names", () => {
  assert.deepEqual(toS3Events(["PUT", "RESTORE"]), [
    "s3:ObjectCreated:*",
    "s3:ObjectRestore:*",
    "s3:ObjectTransition:*",
  ])
  assert.deepEqual(getEventSelection(["s3:ObjectRemoved:*", "s3:Scanner:BigPrefix"]), ["DELETE", "SCANNER"])
})

test("unknown stored events stay editable instead of being dropped", () => {
  const selection = getEventSelection(["s3:ObjectCreated:*", "s3:ObjectTagging:Put", "s3:ObjectCreated:*"])

  assert.deepEqual(selection, ["PUT", "s3:ObjectTagging:Put"])
  assert.deepEqual(toS3Events(selection), ["s3:ObjectCreated:*", "s3:ObjectTagging:Put"])
})

test("notification targets map to the matching configuration list", () => {
  assert.equal(getNotificationType("arn:rustfs:lambda:us-east-1:primary:fn"), "Lambda")
  assert.equal(getNotificationType("arn:rustfs:sqs:us-east-1:primary:webhook"), "SQS")
  assert.equal(getNotificationType("arn:rustfs:sns:us-east-1:primary:topic"), "Topic")
  assert.equal(getNotificationConfigKey("Lambda"), "LambdaFunctionConfigurations")
  assert.equal(getNotificationConfigKey("SQS"), "QueueConfigurations")
  assert.equal(getNotificationConfigKey("Topic"), "TopicConfigurations")
})

test("editing a subscription replaces only its own rule and keeps its Id", () => {
  const current = {
    QueueConfigurations: [
      { Id: "sub-a", QueueArn: "arn:rustfs:sqs:us-east-1:primary:old", Events: ["s3:ObjectCreated:*"] },
      { Id: "sub-b", QueueArn: "arn:rustfs:sqs:us-east-1:primary:other", Events: ["s3:ObjectRemoved:*"] },
    ],
  }

  const updated = updateNotificationRule(current, subscription(), {
    arn: "arn:rustfs:sqs:us-east-1:primary:new",
    events: ["s3:ObjectRemoved:*"],
    filterRules: [
      { Name: "Prefix", Value: "b/" },
      { Name: "Suffix", Value: ".txt" },
    ],
  }) as Record<string, Array<Record<string, unknown>>>

  assert.deepEqual(updated.QueueConfigurations, [
    { Id: "sub-b", QueueArn: "arn:rustfs:sqs:us-east-1:primary:other", Events: ["s3:ObjectRemoved:*"] },
    {
      Id: "sub-a",
      QueueArn: "arn:rustfs:sqs:us-east-1:primary:new",
      Events: ["s3:ObjectRemoved:*"],
      Filter: {
        Key: {
          FilterRules: [
            { Name: "Prefix", Value: "b/" },
            { Name: "Suffix", Value: ".txt" },
          ],
        },
      },
    },
  ])
  assert.deepEqual(current.QueueConfigurations[0], {
    Id: "sub-a",
    QueueArn: "arn:rustfs:sqs:us-east-1:primary:old",
    Events: ["s3:ObjectCreated:*"],
  })
})

test("changing the target type moves the rule to the matching list", () => {
  const current = {
    QueueConfigurations: [{ Id: "sub-a", QueueArn: "arn:old", Events: ["s3:ObjectCreated:*"] }],
    TopicConfigurations: [{ Id: "topic-b", TopicArn: "arn:topic", Events: ["s3:ObjectCreated:*"] }],
  }

  const updated = updateNotificationRule(current, subscription(), {
    arn: "arn:rustfs:sns:us-east-1:primary:topic",
    events: ["s3:ObjectCreated:*"],
    filterRules: [],
  }) as Record<string, Array<Record<string, unknown>>>

  assert.deepEqual(updated.QueueConfigurations, [])
  assert.deepEqual(updated.TopicConfigurations, [
    { Id: "topic-b", TopicArn: "arn:topic", Events: ["s3:ObjectCreated:*"] },
    { Id: "sub-a", TopicArn: "arn:rustfs:sns:us-east-1:primary:topic", Events: ["s3:ObjectCreated:*"] },
  ])
})

test("editing refuses to guess when the stored configuration changed", () => {
  const ambiguous = {
    QueueConfigurations: [
      { Id: "sub-a", QueueArn: "arn:old", Events: ["s3:ObjectCreated:*"] },
      { Id: "sub-a", QueueArn: "arn:old", Events: ["s3:ObjectCreated:*"] },
    ],
  }
  const missing = { QueueConfigurations: [{ Id: "sub-b", QueueArn: "arn:other", Events: [] }] }

  const changes = { arn: "arn:new", events: ["s3:ObjectRemoved:*"], filterRules: [] }
  assert.equal(updateNotificationRule(ambiguous, subscription(), changes), null)
  assert.equal(updateNotificationRule(missing, subscription(), changes), null)
  assert.equal(updateNotificationRule({}, subscription({ sourceId: undefined }), changes), null)
})
