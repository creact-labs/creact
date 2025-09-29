import { Construct } from "constructs";
import { EcrRepository } from "@gen/providers/aws/ecr-repository";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";
import { sharedConfig } from "@config";
import { DataAwsCallerIdentity } from "@gen/providers/aws/data-aws-caller-identity";
import * as crypto from "crypto";

export interface EcrRepositoryConstructProps {
  repositoryName: string;
  environment: string;
  imageTagMutability?: "MUTABLE" | "IMMUTABLE";
  scanOnPush?: boolean;
}

export interface EcrRepositoryOutputs {
  repositoryUrl: string;
  repositoryName: string;
  region: string;
  accountId: string;
}

export class EcrRepositoryConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EcrRepositoryConstructProps) {
    super(scope, id);

    const callerIdentity = new DataAwsCallerIdentity(this, "caller_identity");

    const uniqueBase = `${props.repositoryName}-${props.environment}`;
    const hash = crypto.createHash("sha1").update(uniqueBase).digest("hex").slice(0, 8);
    const finalRepoName = `${props.repositoryName}-${props.environment}-${hash}`;

    const repository = new EcrRepository(this, "ecr_repo", {
      name: finalRepoName,
      imageTagMutability: props.imageTagMutability ?? "MUTABLE",
      imageScanningConfiguration: {
        scanOnPush: props.scanOnPush ?? true,
      },
    });

    new TerraformOutput(this, "repository_url", {
      value: repository.repositoryUrl,
    }).overrideLogicalId(`${props.repositoryName}_${props.environment}_repository_url`);

    new TerraformOutput(this, "repository_name", {
      value: repository.name,
    }).overrideLogicalId(`${props.repositoryName}_${props.environment}_repository_name`);

    new TerraformOutput(this, "aws_region", {
      value: sharedConfig.aws.region,
    }).overrideLogicalId(`${props.repositoryName}_${props.environment}_aws_region`);

    new TerraformOutput(this, "aws_account_id", {
      value: callerIdentity.accountId,
    }).overrideLogicalId(`${props.repositoryName}_${props.environment}_aws_account_id`);
  }

  static fromRemoteState(
    state: DataTerraformRemoteStateS3,
    repoName: string,
    env: string
  ): EcrRepositoryOutputs {
    return {
      repositoryUrl: state.get(`${repoName}_${env}_repository_url`) as unknown as string,
      repositoryName: state.get(`${repoName}_${env}_repository_name`) as unknown as string,
      region: state.get(`${repoName}_${env}_aws_region`) as unknown as string,
      accountId: state.get(`${repoName}_${env}_aws_account_id`) as unknown as string,
    };
  }
}
