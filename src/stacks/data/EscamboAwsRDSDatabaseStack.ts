import { Construct } from "constructs";
import { TerraformStack, S3Backend, DataTerraformRemoteStateS3, TerraformOutput } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { sharedConfig, EnvironmentConfig } from "@config";
import { AwsRDSDatabaseConstruct, NetworkConstruct, SecretsManagerConstruct } from "@src/constructs";

export interface EscamboAwsRDSDatabaseStackProps {
  config: EnvironmentConfig;
  dbName: string;
}

export class EscamboAwsRDSDatabaseStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboAwsRDSDatabaseStackProps) {
    super(scope, id);

    const { config, dbName } = props;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${config.environment}/${dbName}-rds-database.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    const networkState = new DataTerraformRemoteStateS3(this, "network_state", {
      bucket: sharedConfig.terraform.backend.bucket,
      key: "network.tfstate",
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });
    const network = NetworkConstruct.fromRemoteState(networkState);

    const secret = SecretsManagerConstruct.fromRemoteState(
      new DataTerraformRemoteStateS3(this, "secret_state", {
        bucket: sharedConfig.terraform.backend.bucket,
        key: `${config.environment}/secretsmanager.tfstate`,
        region: sharedConfig.aws.region,
        dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
        encrypt: true,
      }),
      "escambo-db-credentials",
      config.environment
    );

    const db = new AwsRDSDatabaseConstruct(this, `${dbName}_rds_database`, {
      environment: config.environment,
      dbName,
      subnetIds: network.subnetIds,
      vpcSecurityGroupIds: [network.serviceSecurityGroupId],
    });

    // Outputs
    new TerraformOutput(this, "db_secret_arn", { value: secret.secretArn });
    new TerraformOutput(this, "db_secret_name", { value: secret.secretName });
    new TerraformOutput(this, "db_endpoint", { value: db.endpoint });
    new TerraformOutput(this, "db_name", { value: db.dbName });
    new TerraformOutput(this, "db_port", { value: db.port });
  }
}
