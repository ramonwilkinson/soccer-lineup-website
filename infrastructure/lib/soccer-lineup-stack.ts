import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as apigwv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import { Construct } from 'constructs'
import * as path from 'path'

const COGNITO_USER_POOL_ID = 'us-east-1_4GXRxmSyH'
const COGNITO_CLIENT_ID = 'o601usi767h2anstq03h9c0gu'

export class SoccerLineupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const table = new dynamodb.Table(this, 'Table', {
      tableName: 'soccer-lineup',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const handler = new lambdaNodejs.NodejsFunction(this, 'Handler', {
      entry: path.join(__dirname, '../lambda/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: table.tableName },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    })

    table.grantReadWriteData(handler)

    const authorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.us-east-1.amazonaws.com/${COGNITO_USER_POOL_ID}`,
      { jwtAudience: [COGNITO_CLIENT_ID] }
    )

    const api = new apigwv2.HttpApi(this, 'Api', {
      apiName: 'soccer-lineup-api',
      corsPreflight: {
        allowOrigins: ['https://wilkinson.guru', 'http://localhost:5173'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    })

    const integration = new apigwv2Integrations.HttpLambdaIntegration('Integration', handler)

    const routes: { method: apigwv2.HttpMethod; path: string }[] = [
      { method: apigwv2.HttpMethod.GET,    path: '/data' },
      { method: apigwv2.HttpMethod.PUT,    path: '/players/{playerId}' },
      { method: apigwv2.HttpMethod.DELETE, path: '/players/{playerId}' },
      { method: apigwv2.HttpMethod.PUT,    path: '/games/{gameId}' },
      { method: apigwv2.HttpMethod.DELETE, path: '/games/{gameId}' },
      { method: apigwv2.HttpMethod.PUT,    path: '/games/{gameId}/configs/{configId}' },
      { method: apigwv2.HttpMethod.DELETE, path: '/games/{gameId}/configs/{configId}' },
    ]

    for (const route of routes) {
      api.addRoutes({ path: route.path, methods: [route.method], integration, authorizer })
    }

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
      exportName: 'SoccerLineupApiUrl',
    })
  }
}
