const CONTRIBUTORS_FROM_LOGS = "git log --all --format='%aN <%aE>' | sort -u";
const SELF_USERNAME = "git config user.name";
const CURRENT_COMMIT_BODY = "git log -1 --format=%B";
const AMEND_MESSAGE = "git commit --allow-empty --amend -m";

const SECTION_TITLE = "Co-Authors";
const COAUTHOR_PREFIX = "Co-authored-by: ";
const COAUTHOR_LINE_REGEX = new RegExp(`^.*?${COAUTHOR_PREFIX}(.*? <.*?>).*?$`);

const command = {
  name: 'coauthor',
  run: async ({ print, prompt, system }) => {
    const currentCommitBody = await system.run(CURRENT_COMMIT_BODY);

    const currentCommitBodyList = currentCommitBody.split('\n');

    const { cleanCommitBody, cleanCommitContributors } = currentCommitBodyList.reduce((result, current) => {
      if (current === SECTION_TITLE) return result;

      const coauthor = current.match(COAUTHOR_LINE_REGEX);
      if (coauthor && coauthor.length) {
        result.cleanCommitContributors.push(coauthor[1]);
        return result;
      }

      result.cleanCommitBody.push(current);

      return result;
    }, { cleanCommitBody: [], cleanCommitContributors: [] });

    const coauthorsList = (contributors) => contributors.map(user => `${COAUTHOR_PREFIX}${user}`);

    const coauthorsBlock = (contributors) => contributors.length > 0
      ? `

Co-Authors
${coauthorsList(contributors).join('\n')}`
      : '';

    const contributorsFromLogs = await system.run(CONTRIBUTORS_FROM_LOGS);

    const repoContributors = contributorsFromLogs.split('\n').filter((item) => item !== '');

    const self = await system.exec(SELF_USERNAME);

    const otherContributors = repoContributors.filter(contributor => !contributor.includes(self));

    const selection = await prompt.ask(
      {
        type: 'autocomplete',
        name: 'contributors',
        message: `"Who did you pair with? (SPACE to Select. Then ENTER/RETURN to Confirm.)"`,
        limit: 5,
        multiple: true,
        choices: otherContributors,
        initial: cleanCommitContributors,
        suggest(s, choices) {
          return choices.filter((choice) => {
            return choice.message.toLowerCase().includes(s.toLowerCase())
          })
        }
      }
    );

    const amended = await system.run(
      `${AMEND_MESSAGE} "${cleanCommitBody.join('\n')}${coauthorsBlock(selection.contributors)}"`
    );

    print.info(`Collaborating with other ${selection.contributors.length} contributor(s).`);
  },
};

module.exports = command;
