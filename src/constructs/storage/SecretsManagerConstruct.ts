import { Construct } from "constructs";
import { SecretsmanagerSecret } from "@gen/providers/aws/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@gen/providers/aws/secretsmanager-secret-version";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";
import * as crypto from "crypto";

export interface SecretsManagerConstructProps {
  secretName: string;
  environment: string;
  initialSecretString?: Record<string, string>;
}

export interface SecretsManagerOutputs {
  secretArn: string;
  secretName: string;
}

export class SecretsManagerConstruct extends Construct {
  constructor(scope: Construct, id: string, props: SecretsManagerConstructProps) {
    super(scope, id);

    const uniqueBase = `${props.secretName}-${props.environment}`;
    const hash = crypto.createHash("sha1").update(uniqueBase).digest("hex").slice(0, 8);
    const finalSecretName = `${props.secretName}-${props.environment}-${hash}`;

    const secret = new SecretsmanagerSecret(this, "secret", {
      name: finalSecretName,
    });

    if (props.initialSecretString) {
      new SecretsmanagerSecretVersion(this, "secret_version", {
        secretId: secret.id,
        secretString: JSON.stringify(props.initialSecretString),
      });
    }

    new TerraformOutput(this, "secret_arn", { value: secret.arn })
      .overrideLogicalId(`${props.secretName}_${props.environment}_secret_arn`);
    new TerraformOutput(this, "secret_name", { value: secret.name })
      .overrideLogicalId(`${props.secretName}_${props.environment}_secret_name`);
  }

  static fromRemoteState(
    state: DataTerraformRemoteStateS3,
    secretName: string,
    env: string
  ): SecretsManagerOutputs {
    return {
      secretArn: state.get(`${secretName}_${env}_secret_arn`) as unknown as string,
      secretName: state.get(`${secretName}_${env}_secret_name`) as unknown as string,
    };
  }
}
