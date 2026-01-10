text
# Complete Git Commands Reference Guide

## 📋 Essential Git Workflow Commands

### 1. Repository Setup & Cloning
```bash
git clone <repository-url>          # Clone repository to local
git clone <repository-url> .        # Clone into current directory
git clone -b <branch> <url>         # Clone specific branch
2. Checking Status & History
bash
git status                           # Current working directory status
git log                              # Full commit history
git log --oneline                    # One-line commit history
git log --graph --oneline --all      # Visual branch graph
git diff                             # See unstaged changes
git diff --staged                    # See staged changes
3. Staging & Committing
bash
git add <file>                       # Stage specific file
git add .                            # Stage all changes
git add -A                           # Stage all changes (including deletions)
git commit -m "Your commit message"  # Commit with message
git commit -am "message"             # Stage & commit tracked files
4. Branch Management
bash
git branch                           # List branches
git branch -a                        # List all branches (local+remote)
git checkout <branch>                # Switch to branch
git checkout -b <branch>             # Create & switch to new branch
git branch -d <branch>               # Delete local branch
git push origin --delete <branch>    # Delete remote branch
5. Remote & Sync Operations
bash
git pull                             # Fetch & merge from remote
git pull origin main                 # Pull specific branch
git push origin main                 # Push to remote main branch
git push -u origin main              # Push & set upstream
git fetch                            # Fetch remote changes only
git remote -v                        # View remote URLs
🔄 Team Collaboration Workflow
text
Team Lead Setup:
1. git clone <classroom-repo-link> .
2. Work on project
3. git pull
4. git add .
5. git commit -m "Initial project setup"
6. git push origin main

Team Members:
1. git clone <team-repo-link> .
2. git pull origin main
3. Make changes
4. git pull origin main      # Always sync first
5. git add .
6. git commit -m "Your feature"
7. git push origin main
⚠️ Troubleshooting Commands
Merge Conflicts
bash
git pull origin main                 # Get latest changes
# Edit conflicted files manually
git add <resolved-files>
git commit -m "Resolve merge conflicts"
git push origin main
Reset & Undo
bash
git checkout -- <file>               # Discard changes to file
git reset HEAD <file>                # Unstage file
git reset --hard HEAD                # Discard all local changes
git revert <commit-hash>             # Undo commit safely
Stash Changes (Temporary Save)
bash
git stash                            # Save uncommitted changes
git stash pop                        # Restore stashed changes
git stash list                       # List stashes
🎯 Pro Tips & Best Practices
Always git pull before pushing to avoid conflicts

Use descriptive commit messages: "Fix login bug" ✓ vs "fixed" ✗

Branch naming: feature/login, bugfix/payment, hotfix/crash

Commit often, small changes (5-10 files max per commit)

📱 Quick Copy-Paste Commands
Daily Workflow:

bash
git pull origin main
# Make changes...
git add .
git commit -m "Your descriptive message"
git push origin main
Emergency Reset:

bash
git reset --hard origin/main
git pull
