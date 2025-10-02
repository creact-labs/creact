// ./constructs/storage/AwsRDSDatabaseConstruct.ts
import { Construct } from "constructs";
import { DbInstance } from "@gen/providers/aws/db-instance";
import { DbSubnetGroup } from "@gen/providers/aws/db-subnet-group";
import { SecretsmanagerSecret } from "@gen/providers/aws/secretsmanager-secret";
import { TerraformOutput } from "cdktf";

export interface AwsRDSDatabaseConstructProps {
  environment: string;
  dbName: string;
  subnetIds: string[];
  vpcSecurityGroupIds: string[];
  instanceClass?: string;
  allocatedStorage?: number;
}

export class AwsRDSDatabaseConstruct extends Construct {
  public readonly endpoint: string;
  public readonly dbName: string;
  public readonly port: number;
  public readonly secretArn: string;

  constructor(scope: Construct, id: string, props: AwsRDSDatabaseConstructProps) {
    super(scope, id);

    const {
      environment,
      dbName,
      subnetIds,
      vpcSecurityGroupIds,
      instanceClass = "db.t3.micro",
      allocatedStorage = 20,
    } = props;

    const secret = new SecretsmanagerSecret(this, "db_secret", {
      name: `${dbName}-${environment}-credentials`,
    });

    const subnetGroup = new DbSubnetGroup(this, "db_subnet_group", {
      name: `${dbName}-${environment}-subnet-group`,
      subnetIds,
    });

    const dbInstance = new DbInstance(this, "db_instance", {
      identifier: `${dbName}-${environment}`,
      engine: "postgres",
      engineVersion: "15.4",
      instanceClass,
      allocatedStorage,
      dbName,
      username: "postgres",
      password: "ChangeMe123!",
      skipFinalSnapshot: true,
      vpcSecurityGroupIds,
      dbSubnetGroupName: subnetGroup.name,
      publiclyAccessible: true,
    });

    this.endpoint = dbInstance.endpoint;
    this.dbName = dbInstance.dbName;
    this.port = 5432;
    this.secretArn = secret.arn;

    new TerraformOutput(this, "db_endpoint", { value: this.endpoint });
    new TerraformOutput(this, "db_name", { value: this.dbName });
    new TerraformOutput(this, "db_secret_arn", { value: this.secretArn });
    new TerraformOutput(this, "db_engine", { value: dbInstance.engine });
    new TerraformOutput(this, "db_engine_version", { value: dbInstance.engineVersion });
    new TerraformOutput(this, "db_instance_id", { value: dbInstance.id });
    new TerraformOutput(this, "db_port", { value: this.port });
  }
}
