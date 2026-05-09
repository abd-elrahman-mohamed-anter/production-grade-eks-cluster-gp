output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = [aws_subnet.public_az1.id, aws_subnet.public_az2.id]
}

output "alb_dns_name" {
  description = "ALB DNS name — use this to access the app"
  value       = aws_lb.main.dns_name
}

output "configure_kubectl" {
  description = "Run this command to connect kubectl to the cluster"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${aws_eks_cluster.main.name}"
}
