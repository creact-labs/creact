import { Construct } from "constructs";
import { Vpc } from "@gen/providers/aws/vpc";
import { Subnet } from "@gen/providers/aws/subnet";
import { SecurityGroup } from "@gen/providers/aws/security-group";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";

const VPC_CIDR = "10.0.0.0/16";
const LB_PORT = 443;
const SERVICE_PORT = 8080;

const SUBNETS = [
  {
    cidr: "10.0.1.0/24",
    azSuffix: "a",
    name: (env: string) => `escambo-subnet-${env}-a`,
  },
  {
    cidr: "10.0.2.0/24",
    azSuffix: "b",
    name: (env: string) => `escambo-subnet-${env}-b`,
  },
];

export interface NetworkConstructProps {
  region: string;
  environment: string;
}

export interface NetworkOutputs {
  vpcId: string;
  subnetIds: string[];
  lbSecurityGroupId: string;
  serviceSecurityGroupId: string;
}

export class NetworkConstruct extends Construct {
  constructor(scope: Construct, id: string, props: NetworkConstructProps) {
    super(scope, id);

    const vpcName = `escambo-vpc-${props.environment}`;
    const lbSgName = `escambo-alb-sg-${props.environment}`;
    const serviceSgName = `escambo-service-sg-${props.environment}`;

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: VPC_CIDR,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: { Name: vpcName },
    });

    const subnets = SUBNETS.map((subnetCfg, i) =>
      new Subnet(this, `subnet_${i + 1}`, {
        vpcId: vpc.id,
        cidrBlock: subnetCfg.cidr,
        availabilityZone: `${props.region}${subnetCfg.azSuffix}`,
        mapPublicIpOnLaunch: true,
        tags: { Name: subnetCfg.name(props.environment) },
      })
    );

    const lbSg = new SecurityGroup(this, "lb_sg", {
      vpcId: vpc.id,
      description: "ALB Security Group",
      ingress: [
        {
          fromPort: LB_PORT,
          toPort: LB_PORT,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      tags: { Name: lbSgName },
    });

    const serviceSg = new SecurityGroup(this, "service_sg", {
      vpcId: vpc.id,
      description: "ECS Service Security Group",
      ingress: [
        {
          fromPort: SERVICE_PORT,
          toPort: SERVICE_PORT,
          protocol: "tcp",
          securityGroups: [lbSg.id],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      tags: { Name: serviceSgName },
    });

    new TerraformOutput(this, "vpc_id", { value: vpc.id }).overrideLogicalId("vpc_id");
    new TerraformOutput(this, "subnet_ids", { value: subnets.map(s => s.id) }).overrideLogicalId("subnet_ids");
    new TerraformOutput(this, "lb_security_group_id", { value: lbSg.id }).overrideLogicalId("lb_security_group_id");
    new TerraformOutput(this, "service_security_group_id", { value: serviceSg.id }).overrideLogicalId("service_security_group_id");
  }

  static fromRemoteState(state: DataTerraformRemoteStateS3): NetworkOutputs {
    return {
      vpcId: state.get("vpc_id") as unknown as string,
      subnetIds: state.get("subnet_ids") as unknown as string[],
      lbSecurityGroupId: state.get("lb_security_group_id") as unknown as string,
      serviceSecurityGroupId: state.get("service_security_group_id") as unknown as string,
    };
  }
}
