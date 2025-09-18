#!/bin/bash

# Setup Commit Signing for PingBuoy
# This script helps developers configure GPG signing for commits

set -e  # Exit on error

echo "🔐 Setting up commit signing for PingBuoy"
echo "========================================"
echo ""

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Check if running on Windows with Git Bash
check_environment() {
    print_info "Checking environment..."

    if command -v gpg >/dev/null 2>&1; then
        print_status "GPG is installed"
        gpg --version | head -1
    else
        print_error "GPG is not installed or not in PATH"
        echo ""
        echo "Please install GPG:"
        echo "  - Windows: Download from https://gpg4win.org/"
        echo "  - macOS: brew install gnupg"
        echo "  - Linux: sudo apt-get install gnupg (Ubuntu/Debian)"
        echo ""
        exit 1
    fi

    if command -v git >/dev/null 2>&1; then
        print_status "Git is installed"
        git --version
    else
        print_error "Git is not installed"
        exit 1
    fi
}

# Check if user already has GPG keys
check_existing_keys() {
    print_info "Checking for existing GPG keys..."

    if gpg --list-secret-keys --keyid-format LONG | grep -q "sec"; then
        print_status "Existing GPG keys found:"
        echo ""
        gpg --list-secret-keys --keyid-format LONG
        echo ""

        read -p "Do you want to use an existing key? [y/N]: " use_existing
        if [[ $use_existing =~ ^[Yy]$ ]]; then
            echo ""
            echo "Available keys:"
            gpg --list-secret-keys --keyid-format LONG | grep "sec" -A 1 | grep -E "(sec|uid)"
            echo ""
            read -p "Enter the GPG key ID (long format after 'sec   rsa4096/'): " key_id

            if [ -n "$key_id" ]; then
                configure_git_signing "$key_id"
                return 0
            fi
        fi
    else
        print_warning "No existing GPG keys found"
    fi
    return 1
}

# Generate a new GPG key
generate_gpg_key() {
    print_info "Generating new GPG key..."

    echo ""
    echo "We'll need some information for your GPG key:"
    read -p "Enter your full name: " full_name
    read -p "Enter your email address (use the same email as your Git commits): " email

    if [ -z "$full_name" ] || [ -z "$email" ]; then
        print_error "Name and email are required"
        exit 1
    fi

    # Create GPG key configuration
    cat > /tmp/gpg-gen-key-script <<EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: $full_name
Name-Email: $email
Expire-Date: 2y
Passphrase-Script: ""
%commit
%echo done
EOF

    print_info "Generating GPG key (this may take a while)..."
    gpg --batch --gen-key /tmp/gpg-gen-key-script

    # Clean up
    rm /tmp/gpg-gen-key-script

    # Get the new key ID
    key_id=$(gpg --list-secret-keys --keyid-format LONG "$email" | grep "sec" | sed -n 's/.*rsa4096\/\([A-F0-9]*\).*/\1/p')

    if [ -n "$key_id" ]; then
        print_status "GPG key generated successfully!"
        print_info "Key ID: $key_id"
    else
        print_error "Failed to generate GPG key"
        exit 1
    fi

    echo "$key_id"
}

# Configure Git to use GPG signing
configure_git_signing() {
    local key_id="$1"

    print_info "Configuring Git to use GPG signing..."

    # Set the GPG key for Git
    git config --global user.signingkey "$key_id"

    # Enable automatic signing for all commits
    git config --global commit.gpgsign true

    # Enable signing for tags
    git config --global tag.gpgsign true

    # Set GPG program (especially important on Windows)
    if command -v gpg.exe >/dev/null 2>&1; then
        git config --global gpg.program gpg.exe
    elif command -v gpg >/dev/null 2>&1; then
        git config --global gpg.program gpg
    fi

    print_status "Git configured for GPG signing"

    # Display current Git signing configuration
    echo ""
    print_info "Current Git GPG configuration:"
    echo "  Signing key: $(git config --global user.signingkey)"
    echo "  Auto-sign commits: $(git config --global commit.gpgsign)"
    echo "  Auto-sign tags: $(git config --global tag.gpgsign)"
    echo "  GPG program: $(git config --global gpg.program)"
}

# Export public key for GitHub
export_public_key() {
    local key_id="$1"

    print_info "Exporting public key for GitHub..."

    echo ""
    print_info "Your GPG public key (copy this to GitHub):"
    echo "=========================================="
    gpg --armor --export "$key_id"
    echo "=========================================="
    echo ""

    print_info "To add this key to GitHub:"
    echo "  1. Copy the entire GPG key block above (including BEGIN/END lines)"
    echo "  2. Go to GitHub → Settings → SSH and GPG keys"
    echo "  3. Click 'New GPG key'"
    echo "  4. Paste the key and save"
    echo ""

    read -p "Press Enter when you've added the key to GitHub..."
}

# Test commit signing
test_commit_signing() {
    print_info "Testing commit signing..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_warning "Not in a git repository, skipping commit signing test"
        return
    fi

    # Create a test commit
    echo "# GPG Signing Test" > .gpg-test
    git add .gpg-test >/dev/null 2>&1 || true

    if git commit -S -m "Test GPG signing" >/dev/null 2>&1; then
        print_status "Commit signing test successful!"

        # Verify the commit signature
        if git verify-commit HEAD >/dev/null 2>&1; then
            print_status "Commit signature verified!"
        else
            print_warning "Commit created but signature verification failed"
        fi

        # Clean up test commit
        git reset HEAD~ >/dev/null 2>&1 || true
        rm -f .gpg-test
    else
        print_error "Failed to create signed commit"
        print_info "You may need to:"
        echo "  - Check your GPG key passphrase"
        echo "  - Ensure GPG agent is running"
        echo "  - Verify Git configuration"
    fi
}

# Main setup flow
main() {
    check_environment

    if ! check_existing_keys; then
        key_id=$(generate_gpg_key)
        configure_git_signing "$key_id"
        export_public_key "$key_id"
    fi

    test_commit_signing

    echo ""
    print_status "Commit signing setup complete!"
    echo ""
    print_info "Summary:"
    echo "  ✓ GPG key configured"
    echo "  ✓ Git configured for automatic signing"
    echo "  ✓ Public key exported for GitHub"
    echo ""
    print_info "Next steps:"
    echo "  1. Add your GPG public key to GitHub"
    echo "  2. Your commits will now be automatically signed"
    echo "  3. Signed commits show a 'Verified' badge on GitHub"
    echo ""
    print_info "Troubleshooting:"
    echo "  - If commits fail: check GPG agent is running"
    echo "  - On Windows: ensure GPG4Win is installed and in PATH"
    echo "  - For help: see GitHub's GPG documentation"
}

# Run main function
main "$@"