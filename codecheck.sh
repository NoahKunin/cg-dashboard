#!/bin/bash

# The value of the exit status for the script.
scriptreturn=0

# Will modify the scriptreturn if anything non-zero comes back from fgt.
function testCmd() {
	eval "$@"
	ret=$?
	if (($ret > 0)); then
		scriptreturn=$ret
		echo "FAILURE: $@"
	fi
}

# This will set the return to non zero if output is returned. useful for go fmt.
# uses fgt instead of eval
function testCmdOutput() {
	fgt "$@"
	ret=$?
	if (($ret > 0)); then
		scriptreturn=$ret
		echo "FAILURE: $@"
	fi
}

# Download the fgt tool which returns a non-zero value if a command prints anything to stdout
go get github.com/GeertJohan/fgt
go install github.com/GeertJohan/fgt

# Golint install
go get -u github.com/golang/lint/golint

# Get the list of packages.
pkgs=`glide novendor -x`

# Lint check
echo
echo
echo '---------------------------------------------------------'
echo 'Doing a lint check on go code'
echo '---------------------------------------------------------'
for pkg in $pkgs
do
	testCmdOutput golint $pkg
done

# Vet check
echo
echo
echo '---------------------------------------------------------'
echo 'Doing a vet check on go code'
echo '---------------------------------------------------------'
for pkg in $pkgs
do
	testCmdOutput go vet $pkg
done

# Fmt Check
echo
echo
echo '---------------------------------------------------------'
echo 'Doing a format / style check on go code'
echo '---------------------------------------------------------'
for pkg in $pkgs
do
	testCmdOutput go fmt $pkg
done

# Coverage Check
go get golang.org/x/tools/cmd/cover
echo
echo
echo '---------------------------------------------------------'
echo 'Doing a code coverage check on go code'
echo '---------------------------------------------------------'
echo "mode: count" > profile.cov
for pkg in $pkgs
do
	echo "testing package $pkg"
	testCmd go test -v -covermode=count $pkg -coverprofile=tmp.cov
	if [ -f tmp.cov ]
	then
		cat tmp.cov | tail -n +2 >> profile.cov
		rm tmp.cov
	fi
done

testCmd go tool cover -func profile.cov

# Determine whether to upload to coveralls
while getopts ":u" opt; do
  case $opt in
    u)
      echo "-u was triggered!" >&2
      go get -u github.com/axw/gocov/gocov
      go get -u github.com/mattn/goveralls
      goveralls -coverprofile=profile.cov -service=travis-ci
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

exit $scriptreturn
