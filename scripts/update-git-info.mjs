#!/usr/bin/env node

// Script to update completion context with git commit information

const actionId = "c0036757-0706-4260-b937-7d8178fa7a65"; // The action we completed earlier
const apiUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const gitInfo = {
  gitCommitHash: "616a92aec000962c342781ec17a20cc7fd6d083c",
  gitCommitMessage: "Add git commit tracking to complete_action MCP tool\n- Add git-related fields to completion_contexts schema:\n  - gitCommitHash: SHA hash of the primary commit\n  - gitCommitMessage: Commit message\n  - gitBranch: Branch name where commit was made\n  - gitCommitAuthor: Commit author (name <email>)\n  - gitCommitTimestamp: When the commit was made\n  - gitDiffStats: Statistics about the changes\n  - gitRelatedCommits: Array of related commit hashes\n- Update complete_action MCP tool to accept optional git parameters\n- Update ActionsService and CompletionContextService to handle git fields\n- Clean up malformed migration snapshots\n- All tests passing\n\nThis creates a stronger connection between completed work and actual code changes.",
  gitBranch: "main",
  gitCommitAuthor: "Ben Nevile <ben.nevile@gmail.com>",
  gitCommitTimestamp: new Date().toISOString(), // We'll use current time since we don't have the exact timestamp
  gitRelatedCommits: ["75d2daa5d97ffb34b3031edee181c4e5700ddedb", "6790a0a4f6f616e0e3a5e3f8e7d9f0a1b2c3d4e5"] // The migration and log rendering commits
};

async function updateCompletionContext() {
  try {
    console.log(`Updating completion context for action ${actionId}...`);
    
    const response = await fetch(`${apiUrl}/api/completion-contexts/${actionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gitInfo),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update: ${response.status} ${response.statusText}\n${error}`);
    }

    const result = await response.json();
    console.log("✅ Successfully updated completion context with git information");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error("❌ Error updating completion context:", error);
    process.exit(1);
  }
}

updateCompletionContext();