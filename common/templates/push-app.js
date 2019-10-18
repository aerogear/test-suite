const getCr = pushAppName => ({
  apiVersion: "push.aerogear.org/v1alpha1",
  kind: "PushApplication",
  metadata: {
    name: pushAppName
  },
  spec: {
    description: "MDC Push Application"
  }
});

module.exports = getCr;
