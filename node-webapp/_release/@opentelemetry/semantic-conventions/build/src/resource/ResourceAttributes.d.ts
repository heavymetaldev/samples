export declare const ResourceAttributes: {
    /**
    * Name of the cloud provider.
    */
    CLOUD_PROVIDER: string;
    /**
    * The cloud account ID the resource is assigned to.
    */
    CLOUD_ACCOUNT_ID: string;
    /**
    * The geographical region the resource is running. Refer to your provider&#39;s docs to see the available regions, for example [AWS regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/), [Azure regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/), or [Google Cloud regions](https://cloud.google.com/about/locations).
    */
    CLOUD_REGION: string;
    /**
    * Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.
    *
    * Note: Availability zones are called &#34;zones&#34; on Google Cloud.
    */
    CLOUD_AVAILABILITY_ZONE: string;
    /**
    * The cloud platform in use.
    *
    * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
    */
    CLOUD_PLATFORM: string;
    /**
    * The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).
    */
    AWS_ECS_CONTAINER_ARN: string;
    /**
    * The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).
    */
    AWS_ECS_CLUSTER_ARN: string;
    /**
    * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
    */
    AWS_ECS_LAUNCHTYPE: string;
    /**
    * The ARN of an [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html).
    */
    AWS_ECS_TASK_ARN: string;
    /**
    * The task definition family this task definition is a member of.
    */
    AWS_ECS_TASK_FAMILY: string;
    /**
    * The revision for this task definition.
    */
    AWS_ECS_TASK_REVISION: string;
    /**
    * The ARN of an EKS cluster.
    */
    AWS_EKS_CLUSTER_ARN: string;
    /**
    * The name(s) of the AWS log group(s) an application is writing to.
    *
    * Note: Multiple log groups must be supported for cases like multi-container applications, where a single application has sidecar containers, and each write to their own log group.
    */
    AWS_LOG_GROUP_NAMES: string;
    /**
    * The Amazon Resource Name(s) (ARN) of the AWS log group(s).
    *
    * Note: See the [log group ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format).
    */
    AWS_LOG_GROUP_ARNS: string;
    /**
    * The name(s) of the AWS log stream(s) an application is writing to.
    */
    AWS_LOG_STREAM_NAMES: string;
    /**
    * The ARN(s) of the AWS log stream(s).
    *
    * Note: See the [log stream ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format). One log group can contain several log streams, so these ARNs necessarily identify both a log group and a log stream.
    */
    AWS_LOG_STREAM_ARNS: string;
    /**
    * Container name.
    */
    CONTAINER_NAME: string;
    /**
    * Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/reference/run/#container-identification). The UUID might be abbreviated.
    */
    CONTAINER_ID: string;
    /**
    * The container runtime managing this container.
    */
    CONTAINER_RUNTIME: string;
    /**
    * Name of the image the container was built on.
    */
    CONTAINER_IMAGE_NAME: string;
    /**
    * Container image tag.
    */
    CONTAINER_IMAGE_TAG: string;
    /**
    * Name of the [deployment environment](https://en.wikipedia.org/wiki/Deployment_environment) (aka deployment tier).
    */
    DEPLOYMENT_ENVIRONMENT: string;
    /**
    * A unique identifier representing the device.
    *
    * Note: The device identifier MUST only be defined using the values outlined below. This value is not an advertising identifier and MUST NOT be used as such. On iOS (Swift or Objective-C), this value MUST be equal to the [vendor identifier](https://developer.apple.com/documentation/uikit/uidevice/1620059-identifierforvendor). On Android (Java or Kotlin), this value MUST be equal to the Firebase Installation ID or a globally unique UUID which is persisted across sessions in your application. More information can be found [here](https://developer.android.com/training/articles/user-data-ids) on best practices and exact implementation details. Caution should be taken when storing personal data or anything which can identify a user. GDPR and data protection laws may apply, ensure you do your own due diligence.
    */
    DEVICE_ID: string;
    /**
    * The model identifier for the device.
    *
    * Note: It&#39;s recommended this value represents a machine readable version of the model identifier rather than the market or consumer-friendly name of the device.
    */
    DEVICE_MODEL_IDENTIFIER: string;
    /**
    * The marketing name for the device model.
    *
    * Note: It&#39;s recommended this value represents a human readable version of the device model rather than a machine readable alternative.
    */
    DEVICE_MODEL_NAME: string;
    /**
    * The name of the function being executed.
    */
    FAAS_NAME: string;
    /**
    * The unique ID of the function being executed.
    *
    * Note: For example, in AWS Lambda this field corresponds to the [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) value, in GCP to the URI of the resource, and in Azure to the [FunctionDirectory](https://github.com/Azure/azure-functions-host/wiki/Retrieving-information-about-the-currently-running-function) field.
    */
    FAAS_ID: string;
    /**
    * The version string of the function being executed as defined in [Version Attributes](../../resource/semantic_conventions/README.md#version-attributes).
    */
    FAAS_VERSION: string;
    /**
    * The execution environment ID as a string.
    */
    FAAS_INSTANCE: string;
    /**
    * The amount of memory available to the serverless function in MiB.
    *
    * Note: It&#39;s recommended to set this attribute since e.g. too little memory can easily stop a Java AWS Lambda function from working correctly. On AWS Lambda, the environment variable `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` provides this information.
    */
    FAAS_MAX_MEMORY: string;
    /**
    * Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider.
    */
    HOST_ID: string;
    /**
    * Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.
    */
    HOST_NAME: string;
    /**
    * Type of host. For Cloud, this must be the machine type.
    */
    HOST_TYPE: string;
    /**
    * The CPU architecture the host system is running on.
    */
    HOST_ARCH: string;
    /**
    * Name of the VM image or OS install the host was instantiated from.
    */
    HOST_IMAGE_NAME: string;
    /**
    * VM image ID. For Cloud, this value is from the provider.
    */
    HOST_IMAGE_ID: string;
    /**
    * The version string of the VM image as defined in [Version Attributes](README.md#version-attributes).
    */
    HOST_IMAGE_VERSION: string;
    /**
    * The name of the cluster.
    */
    K8S_CLUSTER_NAME: string;
    /**
    * The name of the Node.
    */
    K8S_NODE_NAME: string;
    /**
    * The UID of the Node.
    */
    K8S_NODE_UID: string;
    /**
    * The name of the namespace that the pod is running in.
    */
    K8S_NAMESPACE_NAME: string;
    /**
    * The UID of the Pod.
    */
    K8S_POD_UID: string;
    /**
    * The name of the Pod.
    */
    K8S_POD_NAME: string;
    /**
    * The name of the Container in a Pod template.
    */
    K8S_CONTAINER_NAME: string;
    /**
    * The UID of the ReplicaSet.
    */
    K8S_REPLICASET_UID: string;
    /**
    * The name of the ReplicaSet.
    */
    K8S_REPLICASET_NAME: string;
    /**
    * The UID of the Deployment.
    */
    K8S_DEPLOYMENT_UID: string;
    /**
    * The name of the Deployment.
    */
    K8S_DEPLOYMENT_NAME: string;
    /**
    * The UID of the StatefulSet.
    */
    K8S_STATEFULSET_UID: string;
    /**
    * The name of the StatefulSet.
    */
    K8S_STATEFULSET_NAME: string;
    /**
    * The UID of the DaemonSet.
    */
    K8S_DAEMONSET_UID: string;
    /**
    * The name of the DaemonSet.
    */
    K8S_DAEMONSET_NAME: string;
    /**
    * The UID of the Job.
    */
    K8S_JOB_UID: string;
    /**
    * The name of the Job.
    */
    K8S_JOB_NAME: string;
    /**
    * The UID of the CronJob.
    */
    K8S_CRONJOB_UID: string;
    /**
    * The name of the CronJob.
    */
    K8S_CRONJOB_NAME: string;
    /**
    * The operating system type.
    */
    OS_TYPE: string;
    /**
    * Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.
    */
    OS_DESCRIPTION: string;
    /**
    * Human readable operating system name.
    */
    OS_NAME: string;
    /**
    * The version string of the operating system as defined in [Version Attributes](../../resource/semantic_conventions/README.md#version-attributes).
    */
    OS_VERSION: string;
    /**
    * Process identifier (PID).
    */
    PROCESS_PID: string;
    /**
    * The name of the process executable. On Linux based systems, can be set to the `Name` in `proc/[pid]/status`. On Windows, can be set to the base name of `GetProcessImageFileNameW`.
    */
    PROCESS_EXECUTABLE_NAME: string;
    /**
    * The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.
    */
    PROCESS_EXECUTABLE_PATH: string;
    /**
    * The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.
    */
    PROCESS_COMMAND: string;
    /**
    * The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead.
    */
    PROCESS_COMMAND_LINE: string;
    /**
    * All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`.
    */
    PROCESS_COMMAND_ARGS: string;
    /**
    * The username of the user that owns the process.
    */
    PROCESS_OWNER: string;
    /**
    * The name of the runtime of this process. For compiled native binaries, this SHOULD be the name of the compiler.
    */
    PROCESS_RUNTIME_NAME: string;
    /**
    * The version of the runtime of this process, as returned by the runtime without modification.
    */
    PROCESS_RUNTIME_VERSION: string;
    /**
    * An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.
    */
    PROCESS_RUNTIME_DESCRIPTION: string;
    /**
    * Logical name of the service.
    *
    * Note: MUST be the same for all instances of horizontally scaled services. If the value was not specified, SDKs MUST fallback to `unknown_service:` concatenated with [`process.executable.name`](process.md#process), e.g. `unknown_service:bash`. If `process.executable.name` is not available, the value MUST be set to `unknown_service`.
    */
    SERVICE_NAME: string;
    /**
    * A namespace for `service.name`.
    *
    * Note: A string value having a meaning that helps to distinguish a group of services, for example the team name that owns a group of services. `service.name` is expected to be unique within the same namespace. If `service.namespace` is not specified in the Resource then `service.name` is expected to be unique for all services that have no explicit namespace defined (so the empty/unspecified namespace is simply one more valid namespace). Zero-length namespace string is assumed equal to unspecified namespace.
    */
    SERVICE_NAMESPACE: string;
    /**
    * The string ID of the service instance.
    *
    * Note: MUST be unique for each instance of the same `service.namespace,service.name` pair (in other words `service.namespace,service.name,service.instance.id` triplet MUST be globally unique). The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service). It is preferable for the ID to be persistent and stay the same for the lifetime of the service instance, however it is acceptable that the ID is ephemeral and changes during important lifetime events for the service (e.g. service restarts). If the service has no inherent unique ID that can be used as the value of this attribute it is recommended to generate a random Version 1 or Version 4 RFC 4122 UUID (services aiming for reproducible UUIDs may also use Version 5, see RFC 4122 for more recommendations).
    */
    SERVICE_INSTANCE_ID: string;
    /**
    * The version string of the service API or implementation.
    */
    SERVICE_VERSION: string;
    /**
    * The name of the telemetry SDK as defined above.
    */
    TELEMETRY_SDK_NAME: string;
    /**
    * The language of the telemetry SDK.
    */
    TELEMETRY_SDK_LANGUAGE: string;
    /**
    * The version string of the telemetry SDK.
    */
    TELEMETRY_SDK_VERSION: string;
    /**
    * The version string of the auto instrumentation agent, if used.
    */
    TELEMETRY_AUTO_VERSION: string;
    /**
    * The name of the web engine.
    */
    WEBENGINE_NAME: string;
    /**
    * The version of the web engine.
    */
    WEBENGINE_VERSION: string;
    /**
    * Additional description of the web engine (e.g. detailed version and edition information).
    */
    WEBENGINE_DESCRIPTION: string;
};
export declare enum CloudProviderValues {
    /** Amazon Web Services. */
    AWS = "aws",
    /** Microsoft Azure. */
    AZURE = "azure",
    /** Google Cloud Platform. */
    GCP = "gcp"
}
export declare enum CloudPlatformValues {
    /** AWS Elastic Compute Cloud. */
    AWS_EC2 = "aws_ec2",
    /** AWS Elastic Container Service. */
    AWS_ECS = "aws_ecs",
    /** AWS Elastic Kubernetes Service. */
    AWS_EKS = "aws_eks",
    /** AWS Lambda. */
    AWS_LAMBDA = "aws_lambda",
    /** AWS Elastic Beanstalk. */
    AWS_ELASTIC_BEANSTALK = "aws_elastic_beanstalk",
    /** Azure Virtual Machines. */
    AZURE_VM = "azure_vm",
    /** Azure Container Instances. */
    AZURE_CONTAINER_INSTANCES = "azure_container_instances",
    /** Azure Kubernetes Service. */
    AZURE_AKS = "azure_aks",
    /** Azure Functions. */
    AZURE_FUNCTIONS = "azure_functions",
    /** Azure App Service. */
    AZURE_APP_SERVICE = "azure_app_service",
    /** Google Cloud Compute Engine (GCE). */
    GCP_COMPUTE_ENGINE = "gcp_compute_engine",
    /** Google Cloud Run. */
    GCP_CLOUD_RUN = "gcp_cloud_run",
    /** Google Cloud Kubernetes Engine (GKE). */
    GCP_KUBERNETES_ENGINE = "gcp_kubernetes_engine",
    /** Google Cloud Functions (GCF). */
    GCP_CLOUD_FUNCTIONS = "gcp_cloud_functions",
    /** Google Cloud App Engine (GAE). */
    GCP_APP_ENGINE = "gcp_app_engine"
}
export declare enum AwsEcsLaunchtypeValues {
    /** ec2. */
    EC2 = "ec2",
    /** fargate. */
    FARGATE = "fargate"
}
export declare enum HostArchValues {
    /** AMD64. */
    AMD64 = "amd64",
    /** ARM32. */
    ARM32 = "arm32",
    /** ARM64. */
    ARM64 = "arm64",
    /** Itanium. */
    IA64 = "ia64",
    /** 32-bit PowerPC. */
    PPC32 = "ppc32",
    /** 64-bit PowerPC. */
    PPC64 = "ppc64",
    /** 32-bit x86. */
    X86 = "x86"
}
export declare enum OsTypeValues {
    /** Microsoft Windows. */
    WINDOWS = "windows",
    /** Linux. */
    LINUX = "linux",
    /** Apple Darwin. */
    DARWIN = "darwin",
    /** FreeBSD. */
    FREEBSD = "freebsd",
    /** NetBSD. */
    NETBSD = "netbsd",
    /** OpenBSD. */
    OPENBSD = "openbsd",
    /** DragonFly BSD. */
    DRAGONFLYBSD = "dragonflybsd",
    /** HP-UX (Hewlett Packard Unix). */
    HPUX = "hpux",
    /** AIX (Advanced Interactive eXecutive). */
    AIX = "aix",
    /** Oracle Solaris. */
    SOLARIS = "solaris",
    /** IBM z/OS. */
    Z_OS = "z_os"
}
export declare enum TelemetrySdkLanguageValues {
    /** cpp. */
    CPP = "cpp",
    /** dotnet. */
    DOTNET = "dotnet",
    /** erlang. */
    ERLANG = "erlang",
    /** go. */
    GO = "go",
    /** java. */
    JAVA = "java",
    /** nodejs. */
    NODEJS = "nodejs",
    /** php. */
    PHP = "php",
    /** python. */
    PYTHON = "python",
    /** ruby. */
    RUBY = "ruby",
    /** webjs. */
    WEBJS = "webjs"
}
//# sourceMappingURL=ResourceAttributes.d.ts.map