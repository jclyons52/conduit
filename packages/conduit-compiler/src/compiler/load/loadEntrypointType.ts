import { Project } from 'ts-morph';

export function loadEntrypointType(
  tsConfigPath: string,
  entryFilePath: string,
  typeName: string
) {
  const project = new Project({
    tsConfigFilePath: tsConfigPath,
  });

  const sourceFile = project.getSourceFileOrThrow(entryFilePath);
  const typeAlias = sourceFile.getTypeAliasOrThrow(typeName);
  return typeAlias.getType();
}
