package org.rascalmpl.parser.sgll.stack;

import org.eclipse.imp.pdb.facts.IConstructor;
import org.rascalmpl.parser.sgll.result.CharNode;
import org.rascalmpl.parser.sgll.result.INode;

public final class CharStackNode extends AbstractStackNode implements IReducableStackNode{
	private final char[][] ranges;
	
	private INode result;
	
	public CharStackNode(int id, char[][] ranges){
		super(id);

		this.ranges = ranges;
	}
	
	private CharStackNode(CharStackNode charParseStackNode){
		super(charParseStackNode);
		
		ranges = charParseStackNode.ranges;
	}
	
	public String getMethodName(){
		throw new UnsupportedOperationException();
	}
	
	public boolean reduce(char[] input){
		return reduce(input, startLocation);
	}
	
	public boolean reduce(char[] input, int location){
		char next = input[location];
		for(int i = ranges.length - 1; i >= 0; i--){
			char[] range = ranges[i];
			if(next >= range[0] && next <= range[1]){
				result = new CharNode(next);
				return true;
			}
		}
		
		return false;
	}
	
	public boolean isClean(){
		return true;
	}
	
	public AbstractStackNode getCleanCopy(){
		return new CharStackNode(this);
	}
	
	public AbstractStackNode getCleanCopyWithPrefix(){
		CharStackNode cpsn = new CharStackNode(this);
		cpsn.prefixes = prefixes;
		cpsn.prefixStartLocations = prefixStartLocations;
		return cpsn;
	}
	
	public int getLength(){
		return 1;
	}
	
	public AbstractStackNode[] getChildren(){
		throw new UnsupportedOperationException();
	}
	
	public void addResult(IConstructor production, INode[] children){
		throw new UnsupportedOperationException();
	}
	
	public INode getResult(){
		return result;
	}
	
	public String toString(){
		StringBuilder sb = new StringBuilder();
		
		sb.append('[');
		for(int i = ranges.length - 1; i >= 0; i--){
			char[] range = ranges[i];
			sb.append(range[0]);
			sb.append('-');
			sb.append(range[1]);
		}
		sb.append(']');
		
		sb.append(getId());
		sb.append('(');
		sb.append(startLocation);
		sb.append(',');
		sb.append(startLocation + getLength());
		sb.append(')');
		
		return sb.toString();
	}
}
