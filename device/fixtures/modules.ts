import * as aerogearPush from "@aerogear/push";
import * as offix from "offix-client-boost";
import gql from "graphql-tag";
import * as _ToggleNetworkStatus from "./ToggleNetworkStatus";

export const modules = {
  "@aerogear/push": aerogearPush,
  "offix-client-boost": offix,
  "graphql-tag": { gql },
  "./ToggleNetworkStatus": _ToggleNetworkStatus
};

export type Modules = typeof modules;
