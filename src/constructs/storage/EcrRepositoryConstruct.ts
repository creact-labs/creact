import { Construct } from "constructs";
import { EcrRepository } from "@gen/providers/aws/ecr-repository";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";
import { sharedConfig } from "@config";
import { DataAwsCallerIdentity } from "@gen/providers/aws/data-aws-caller-identity";

export interface EcrRepositoryConstructProps {
  repositoryName: string;
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

    const repository = new EcrRepository(this, "ecr_repo", {
      name: props.repositoryName,
      imageTagMutability: props.imageTagMutability ?? "MUTABLE",
      imageScanningConfiguration: {
        scanOnPush: props.scanOnPush ?? true,
      },
    });

    new TerraformOutput(this, "repository_url", {
      value: repository.repositoryUrl,
    }).overrideLogicalId("repository_url");

    new TerraformOutput(this, "repository_name", {
      value: repository.name,
    }).overrideLogicalId("repository_name");

    new TerraformOutput(this, "aws_region", {
      value: sharedConfig.aws.region,
    }).overrideLogicalId("aws_region");

    new TerraformOutput(this, "aws_account_id", {
      value: callerIdentity.accountId,
    }).overrideLogicalId("aws_account_id");
  }

  static fromRemoteState(state: DataTerraformRemoteStateS3): EcrRepositoryOutputs {
    return {
      repositoryUrl: state.get("repository_url") as unknown as string,
      repositoryName: state.get("repository_name") as unknown as string,
      region: state.get("aws_region") as unknown as string,
      accountId: state.get("aws_account_id") as unknown as string,
    };
  }
}
