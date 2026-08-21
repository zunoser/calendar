module "repository" {
  source = "git::https://github.com/zunoser/tfmodule-gh-repo-kit.git?ref=v0.1.0"

  name        = "calendar"
  description = ""
  visibility  = "public"

  general = {
    auto_init              = false
    default_branch         = "main"
    allow_merge_commit     = true
    allow_rebase_merge     = true
    allow_squash_merge     = true
    delete_branch_on_merge = false
  }

  # Keep the existing repository policy unchanged. Enable the standard
  # ruleset separately after maintainers agree on the rollout.
  default_branch_ruleset = null
}
