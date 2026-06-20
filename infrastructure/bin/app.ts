#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { SoccerLineupStack } from '../lib/soccer-lineup-stack'

const app = new cdk.App()
new SoccerLineupStack(app, 'SoccerLineupStack', {
  env: { account: '356697480979', region: 'us-east-1' },
})
