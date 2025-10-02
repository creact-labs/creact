import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { sharedConfig, EnvironmentConfig } from "@config";
import { SecretsManagerConstruct } from "@src/constructs";

export interface EscamboSecretsManagerStackProps {
  config: EnvironmentConfig;
}

export class EscamboSecretsManagerStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: EscamboSecretsManagerStackProps) {
    super(scope, id);

    const envConfig = props.config;

    new AwsProvider(this, "aws", {
      region: sharedConfig.aws.region,
    });

    new S3Backend(this, {
      bucket: sharedConfig.terraform.backend.bucket,
      key: `${envConfig.environment}/secretsmanager.tfstate`,
      region: sharedConfig.aws.region,
      dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
      encrypt: true,
    });

    new SecretsManagerConstruct(this, `db_secret_${envConfig.environment}`, {
      secretName: "escambo-db-credentials",
      environment: envConfig.environment,
      initialSecretString: {
        username: "postgres",
        password: "ChangeMe123!",
      },
    });
  }
}
