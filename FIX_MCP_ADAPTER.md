# Fix MCP Adapter Field Swapping Issue

I've forked the @vercel/mcp-adapter repository to fix an issue where the adapter is swapping URI and description fields when handling MCP resources. 

## The Problem

When a resource is defined with `server.resource("actions", "List all actions with pagination support", handler)`, the handler receives the description "List all actions with pagination support" as the URI parameter instead of the actual resource URI "actions".

## Tasks

Please help me:
1. Locate where resource handling occurs in the codebase
2. Identify where the URI/description field swapping is happening 
3. Fix the issue so that resource handlers receive the correct URI parameter
4. Test the fix to ensure resources work as expected

## Goal

The goal is to ensure that when a resource handler is called, the `uri` parameter contains the actual resource identifier (like "actions" or "action/123") rather than the description text.

## Repository

Fork the repository from: https://github.com/vercel/mcp-adapter.git