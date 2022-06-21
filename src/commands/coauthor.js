const command = {
  name: 'coauthor',
  run: async (toolbox) => {
    const { print, prompt, system } = toolbox

    const contributorsFromLogs = await system.run(
      "git log --all --format='%aN <%aE>' | sort -u"
    )

    const repoContributors = contributorsFromLogs.split('\n')

    const self = await system.exec("git config user.name")

    const otherContributors = repoContributors.filter(contributor => !contributor.includes(self))

    const selection = await prompt.ask({
      type: 'autocomplete',
      name: 'contributors',
      message: `"Who did you pair with? (Select multiple with [spacebar] or hit Enter)"`,
      limit: 5,
      multiple: true,
      choices: otherContributors,
      suggest(s, choices) {
        return choices.filter((choice) => {
          return choice.message.toLowerCase().includes(s.toLowerCase())
        })
      },
    })

    const currentMessage = await system.run("git log -1 --format=%B")

    const ammended = await system.run(
      `git commit --allow-empty --amend -m "${currentMessage}

Co-Authors
${selection.contributors.map(user => `Co-authored-by: ${user}`).join('\n')}"`
    )

    print.info(`Added ${selection.contributors.length} contributor(s).`)
  },
}

module.exports = command
