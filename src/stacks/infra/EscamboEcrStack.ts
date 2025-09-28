import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@gen/providers/aws/provider";
import { config, sharedConfig } from "@config";
import { EcrRepositoryConstruct } from "@src/constructs";

export class EscamboEcrStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        new AwsProvider(this, "aws", {
            region: sharedConfig.aws.region,
        });

        new S3Backend(this, {
            bucket: sharedConfig.terraform.backend.bucket,
            key: "ecr.tfstate",
            region: sharedConfig.aws.region,
            dynamodbTable: sharedConfig.terraform.backend.dynamodbTable,
            encrypt: true,
        });
        Object.values(config).forEach((envConfig: any) => {
            new EcrRepositoryConstruct(this, `core_service_repo_${envConfig.environment}`, {
                repositoryName: `core-java-service-${envConfig.environment}`,
                imageTagMutability: "MUTABLE",
                scanOnPush: true,
            });
        });
    }
}
