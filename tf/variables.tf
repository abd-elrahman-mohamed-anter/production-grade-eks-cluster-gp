variable "region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  default     = "zap-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  default     = "1.29"
}

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  default     = "t3.small"
}

variable "node_desired_size" {
  default = 2
}

variable "node_min_size" {
  default = 1
}

variable "node_max_size" {
  default = 3
}
